#!/usr/bin/env node
// 极简本地预览服务器 - 模拟 Vercel 路由
// /api/*  → api/*.js
// 其它    → public/*
// 启动: PORT=3000 node scripts/serve.js

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function runApi(file, req, res) {
  delete require.cache[require.resolve(file)];
  const mod = require(file);
  const fn = mod.default || mod;
  // 构造 Vercel-style req/res
  const url = new URL(req.url, 'http://localhost');
  req.query = Object.fromEntries(url.searchParams);
  res.setHeader = res.setHeader.bind(res);
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
  };
  Promise.resolve(fn(req, res)).catch((err) => {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message, stack: err.stack }));
  });
}

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    // /api/* 路由
    if (p.startsWith('/api/')) {
      const file = path.join(ROOT, `${p}.js`);
      if (fs.existsSync(file)) return runApi(file, req, res);
      res.statusCode = 404;
      return res.end('api not found');
    }
    // 静态
    if (p === '/') p = '/index.html';
    const full = path.join(PUBLIC_DIR, p);
    if (!full.startsWith(PUBLIC_DIR)) {
      res.statusCode = 403;
      return res.end('forbidden');
    }
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      const ext = path.extname(full);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(full).pipe(res);
    } else {
      res.statusCode = 404;
      res.end('not found: ' + p);
    }
  })
  .listen(PORT, () => {
    console.log(`positive-energy-site dev → http://localhost:${PORT}`);
  });
