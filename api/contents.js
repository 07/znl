// GET /api/contents
//   ?category=text|image_text|video   单类
//   ?limit=N                          每类最多 N 条
//   ?fresh=1                          强制重新抓取(慢,但保证最新)
//
// 默认行为:从存储读,无内容时降级为内置兜底库
// 这样即使没人配 cron / KV 也能立刻看到内容

const { runAll, loadConfig } = require('../lib/fetcher');
const storage = require('../lib/storage');
const { pickQuotes, pickCards, pickVideos } = require('../lib/quoteBank');

function fallbackEmpty() {
  const cfg = loadConfig();
  const n = (cfg.settings && cfg.settings.perCategory) || 3;
  return {
    updatedAt: new Date().toISOString(),
    source: 'built-in-fallback',
    text: pickQuotes(n),
    image_text: pickCards(n),
    video: pickVideos(n)
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');

  try {
    let data = null;
    const forceFresh = req.query && req.query.fresh === '1';

    if (!forceFresh) {
      data = await storage.load();
    }

    if (!data) {
      // 没有持久化数据 → 现场跑一次抓取(读不到外部源就用兜底库)
      try {
        data = await runAll();
        data.source = 'on-the-fly';
        // 顺手存一下(对 KV 友好,对 file backend 在 serverless 上无效)
        try {
          await storage.save(data);
        } catch (_) {}
      } catch (err) {
        data = fallbackEmpty();
      }
    }

    // 过滤
    const limit = parseInt((req.query && req.query.limit) || '0', 10) || 0;
    const category = req.query && req.query.category;
    let payload = data;
    if (category && data[category]) {
      payload = { ...data, [category]: data[category] };
    }
    if (limit) {
      payload = {
        ...payload,
        text: (payload.text || []).slice(0, limit),
        image_text: (payload.image_text || []).slice(0, limit),
        video: (payload.video || []).slice(0, limit)
      };
    }

    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};
