#!/usr/bin/env node
// 生成一份初始 contents.json (用兜底库),保证首次部署就有内容
// 真正的内容由 GitHub Actions / Vercel Cron 在第一次运行时覆盖

const fs = require('fs');
const path = require('path');
const { pickQuotes, pickCards, pickVideos } = require('../lib/quoteBank');

const data = {
  updatedAt: new Date().toISOString(),
  source: 'seed',
  text: pickQuotes(3),
  image_text: pickCards(3),
  video: pickVideos(3)
};

const out = path.join(__dirname, '..', 'public', 'data', 'contents.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data, null, 2), 'utf-8');
console.log('seed →', out);
