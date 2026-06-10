// 抓取编排:按 config.json 跑每个类目的所有 source,失败时用兜底库
// 输出统一的 contents.json 结构 { updatedAt, text:[], image_text:[], video:[] }

const fs = require('fs');
const path = require('path');
const sources = require('./sources');
const { pickQuotes, pickCards, pickVideos } = require('./quoteBank');

function loadConfig() {
  const p = path.join(process.cwd(), 'config.json');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function perCategory(cfg) {
  const { perCategory = 3, perCategoryMax = 10 } = cfg.settings || {};
  return Math.min(perCategory, perCategoryMax);
}

async function fetchCategory(categoryKey, catCfg, n) {
  const results = [];
  const errors = [];
  for (const src of catCfg.sources || []) {
    if (results.length >= n) break;
    try {
      let items = [];
      switch (src.type) {
        case 'rss':
          items = await sources.rss(src);
          break;
        case 'unsplash':
          items = await sources.unsplash(src);
          break;
        case 'youtube_channel':
          items = await sources.youtube_channel(src);
          break;
        case 'json':
          items = await sources.json(src);
          break;
        case 'fallback_quotes':
          items = pickQuotes(src.limit || n);
          break;
        case 'fallback_cards':
          items = pickCards(src.limit || n);
          break;
        case 'fallback_videos':
          items = pickVideos(src.limit || n);
          break;
        default:
          console.warn(`[${categoryKey}] unknown source type: ${src.type}`);
      }
      // 去重 + 截断
      for (const it of items) {
        if (results.length >= n) break;
        if (!results.find((r) => r.title === it.title && r.source === it.source)) {
          results.push(it);
        }
      }
      console.log(
        `[${categoryKey}] ${src.type} (${src.name || src.url || ''}) → +${items.length}`
      );
    } catch (err) {
      const msg = `[${categoryKey}] ${src.type} (${src.name || src.url || ''}) failed: ${err.message}`;
      console.warn(msg);
      errors.push(msg);
    }
  }

  // 兜底:如果一条都没拿到,用内置库强制凑齐
  if (results.length === 0) {
    if (categoryKey === 'text') results.push(...pickQuotes(n));
    if (categoryKey === 'image_text') results.push(...pickCards(n));
    if (categoryKey === 'video') results.push(...pickVideos(n));
    console.warn(`[${categoryKey}] fell back to built-in library (${results.length})`);
  }

  // 截断到 n
  return { items: results.slice(0, n), errors };
}

async function runAll(configOverride) {
  const cfg = configOverride || loadConfig();
  const n = perCategory(cfg);
  const out = { updatedAt: new Date().toISOString(), errors: [] };

  // 整体超时 25 秒 — Vercel Function hobby 10s timeout 对 25s 不够,
  // 所以也支持外部传入 AbortSignal / timeout
  const GLOBAL_TIMEOUT_MS = parseInt(process.env.FETCH_GLOBAL_TIMEOUT || '25000', 10);
  const timeoutErr = new Error(`global fetch timeout after ${GLOBAL_TIMEOUT_MS}ms`);
  const timer = setTimeout(() => { throw timeoutErr; }, GLOBAL_TIMEOUT_MS).unref();

  try {
    for (const key of Object.keys(cfg.categories)) {
      const cat = cfg.categories[key];
      try {
        const { items, errors } = await fetchCategory(key, cat, n);
        out[key] = items;
        out.errors.push(...errors);
      } catch (err) {
        // 单个类目挂了不影响其它
        console.warn(`[${key}] fatal: ${err.message}`);
        out.errors.push(`[${key}] ${err.message}`);
        if (key === 'text') out.text = [];
        if (key === 'image_text') out.image_text = [];
        if (key === 'video') out.video = [];
      }
    }
  } finally {
    clearTimeout(timer);
  }
  return out;
}

module.exports = { runAll, loadConfig };
