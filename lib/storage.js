// 存储抽象
// - Vercel 上:如果配了 Vercel KV,就用 KV
// - 本地 / 静态托管:写文件 public/data/contents.json

const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(process.cwd(), 'public', 'data', 'contents.json');
const KV_KEY = 'contents';

function hasKV() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function load() {
  if (hasKV()) {
    const { kv } = require('@vercel/kv');
    const raw = await kv.get(KV_KEY);
    return raw || null;
  }
  if (fs.existsSync(FILE_PATH)) {
    return JSON.parse(fs.readFileSync(FILE_PATH, 'utf-8'));
  }
  return null;
}

async function save(contents) {
  if (hasKV()) {
    const { kv } = require('@vercel/kv');
    await kv.set(KV_KEY, contents);
    return { ok: true, backend: 'vercel-kv' };
  }
  fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(contents, null, 2), 'utf-8');
  return { ok: true, backend: 'file', path: FILE_PATH };
}

module.exports = { load, save, hasKV };
