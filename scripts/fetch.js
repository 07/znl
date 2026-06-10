#!/usr/bin/env node
// 本地抓取脚本 - GitHub Actions / 本地 cron 都用这个
// 用法: node scripts/fetch.js [--count 10] [--out public/data/contents.json]

const path = require('path');
const fs = require('fs');
const { runAll } = require('../lib/fetcher');

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

(async () => {
  try {
    // 可选:命令行 --count 覆盖 config 里的 perCategory
    const count = parseInt(arg('--count', '0'), 10) || 0;
    let cfg = null;
    const configPath = path.join(process.cwd(), 'config.json');
    if (count && fs.existsSync(configPath)) {
      cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      cfg.settings = { ...(cfg.settings || {}), perCategory: count };
    }

    console.log('[fetch] start', new Date().toISOString());
    const data = await runAll(cfg);

    const out = arg('--out', 'public/data/contents.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(data, null, 2), 'utf-8');

    console.log('[fetch] saved →', out);
    console.log('[fetch] counts:', {
      text: (data.text || []).length,
      image_text: (data.image_text || []).length,
      video: (data.video || []).length
    });
    if (data.errors && data.errors.length) {
      console.warn('[fetch] errors:', data.errors.slice(0, 5));
    }
  } catch (err) {
    console.error('[fetch] FAILED:', err);
    process.exit(1);
  }
})();
