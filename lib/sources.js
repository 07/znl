// 不同 source type 的采集器
// 自实现的极简 RSS 解析,避免 rss-parser 内部阻塞 event loop
// Node 18+ 自带全局 fetch + AbortController,无需第三方依赖

const fetch = globalThis.fetch;
const AbortController = globalThis.AbortController;

const UA =
  process.env.USER_AGENT || 'PositiveEnergyBot/1.0 (+https://github.com/)';

function withTimeout(promise, ms = 3000, label = 'op') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms);
    if (t && typeof t.unref === 'function') t.unref();
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

// 极简 RSS 解析 — 只取需要字段,正则匹配
// 不追求完整规范,实际用到的 RSS 都能解析
function parseRSS(xml) {
  const items = [];
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  const altItemRe = /<entry[\s>]([\s\S]*?)<\/entry>/gi; // Atom
  const blocks = [];
  let m;
  while ((m = itemRe.exec(xml)) !== null) blocks.push(m[1]);
  while ((m = altItemRe.exec(xml)) !== null) blocks.push(m[1]);

  for (const block of blocks) {
    const item = {};
    const tag = (re, def = '') => {
      const r = block.match(re);
      return r ? r[1].trim() : def;
    };
    // 标准 RSS
    item.title = tag(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    item.link = tag(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)
      || tag(/<link[^>]*href=["']([^"']+)["']/i)
      || tag(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    item.contentSnippet = tag(/<description[^>]*>([\s\S]*?)<\/description>/i);
    item.content = item.contentSnippet
      || tag(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
    item.pubDate = tag(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    item.contentEncoded = item.content;
    // enclosure
    const enc = block.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']([^"']+)["']/i);
    if (enc) {
      item.enclosure = { url: enc[1], type: enc[2] };
    }
    // media:content
    const mc = block.match(/<media:content[^>]*url=["']([^"']+)["']/i);
    if (mc) item.mediaContent = mc[1];
    items.push(item);
  }
  return items;
}

// ===  RSS  ===
async function fromRSS(source) {
  const controller = new AbortController();
  const res = await withTimeout(
    fetch(source.url, {
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, */*' },
      signal: controller.signal
    }),
    3000,
    `rss:${source.name || source.url}`
  );
  if (!res.ok) throw new Error(`rss status ${res.status}`);
  const xml = await withTimeout(res.text(), 3000, 'rss:body');
  const feedTitleMatch = xml.match(/<channel>[\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)
    || xml.match(/<feed[\s>][\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
  const feedTitle = feedTitleMatch ? feedTitleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  const items = parseRSS(xml);
  const limit = source.limit || 5;
  return items.slice(0, limit).map((it, i) => ({
    id: `rss-${Date.now()}-${i}`,
    type: guessType(it),
    title: stripHtml(it.title || '(无标题)'),
    desc: stripHtml(it.contentSnippet || it.title || '').slice(0, 140),
    body: stripHtml(it.content || it.contentSnippet || ''),
    image: pickImage(it),
    url: it.link || '#',
    publishedAt: toISO(it.pubDate) || new Date().toISOString(),
    tags: [],
    source: feedTitle || source.name || 'RSS'
  }));
}

// ===  Picsum 图片 (免 key、稳定) ===
// 严格说是"图"而不是"unsplash",但保留 unsplash 类型以兼容旧 config,
// 内部用 picsum.photos 生成与关键词绑定的占位图
async function fromUnsplash(source) {
  const queries = source.queries || ['happiness', 'sunrise'];
  const limit = source.limit || 6;
  const out = [];
  for (let i = 0; i < limit; i++) {
    const q = queries[i % queries.length];
    // picsum.photos:根据 seed 生成稳定图,免 key,全球可访问
    const seed = `${q}-${i}-${new Date().toISOString().slice(0, 10)}`;
    out.push({
      id: `pic-${Date.now()}-${i}`,
      type: 'image_text',
      title: prettyTitle(q, i),
      desc: prettyDesc(q, i),
      body: prettyDesc(q, i),
      // 主图: Picsum (免 key), 纯静态占位: 渐变 SVG (data: URL, 免网络)
      image: `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/600`,
      fallbackImage: gradientDataURL(seed, 800, 600),
      url: `https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/1200`,
      publishedAt: new Date().toISOString(),
      tags: [q, '美图'],
      source: source.name || 'Picsum'
    });
  }
  return out;
}

// ===  YouTube 频道 (通过 RSS,免 API key) ===
async function fromYouTubeChannel(source) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${source.channelId}`;
  const items = await withTimeout(fromRSS({ ...source, url, name: source.name, limit: source.limit || 5 }), 3500, `yt:${source.channelId}`);
  return items.map((it, i) => {
    const videoId = extractYTId(it.url);
    return {
      ...it,
      id: `yt-${Date.now()}-${i}`,
      type: 'video',
      image: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : it.image,
      embed: videoId ? `https://www.youtube.com/embed/${videoId}` : '',
      tags: ['YouTube', '视频']
    };
  });
}

// ===  B 站 UP 主最新投稿 ===
// 用 B 站公开 API(后端调用不受 CORS 限制),按 mid 拿该 UP 最新 N 个视频
async function fromBilibiliUser(source) {
  if (!source.mid) throw new Error('bilibili_user requires mid');
  const limit = source.limit || 5;
  const url = `https://api.bilibili.com/x/space/arc/search?mid=${encodeURIComponent(source.mid)}&pn=1&ps=${Math.min(limit, 30)}&order=pubdate&jsonp=jsonp`;
  const res = await withTimeout(
    fetch(url, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://space.bilibili.com/'
      },
      signal: new AbortController().signal
    }),
    4000,
    `bili:${source.name || source.mid}`
  );
  if (!res.ok) throw new Error(`bilibili status ${res.status}`);
  const data = await res.json();
  const list = (data && data.data && data.data.list && data.data.list.vlist) || [];
  if (!list.length) throw new Error('bilibili empty vlist');
  return list.map((v) => biliItemFromArc(v, source));
}

// ===  B 站搜索 (拿真实可播放的 BV 号) ===
// 根据关键词在 B 站搜,拿到可嵌入 player 的真实视频
async function fromBilibiliSearch(source) {
  if (!source.keyword) throw new Error('bilibili_search requires keyword');
  const limit = source.limit || 5;
  const order = source.order || 'totalrank';  // totalrank 综合排序(最稳) / pubdate 最新 / click 播放多
  const duration = source.duration || 0;        // 0=全部 1=10分钟内 2=10-30分 3=30-60分 4=60分以上
  const url = `https://api.bilibili.com/x/web-interface/search/all/v2?keyword=${encodeURIComponent(source.keyword)}&page=1&order=${order}&duration=${duration}&tids=0`;
  const res = await withTimeout(
    fetch(url, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://www.bilibili.com/'
      },
      signal: new AbortController().signal
    }),
    4000,
    `bili-search:${source.keyword}`
  );
  if (!res.ok) throw new Error(`bilibili search status ${res.status}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(`bilibili search code ${data.code}`);
  // 在 result 里挑 video 分类
  const videoGroup = (data.data?.result || []).find((r) => r.result_type === 'video');
  const list = videoGroup?.data || [];
  if (!list.length) throw new Error('bilibili search empty video result');
  return list
    .filter((v) => v.bvid)  // 去掉没 bvid 的
    .slice(0, limit)
    .map((v) => biliItemFromSearch(v, source));
}

// 统一构造 B 站视频 item(上面两个 source 复用)
function biliItemFromArc(v, source) {
  const bvid = v.bvid || '';
  const pic = normalizePic(v.pic);
  return {
    id: `bili-${bvid || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'video',
    title: stripHtml(v.title || '(无标题)'),
    desc: stripHtml(v.description || v.title || '').slice(0, 140),
    body: stripHtml(v.description || v.title || ''),
    image: pic,
    embed: bvid ? `//player.bilibili.com/player.html?bvid=${bvid}&autoplay=0&danmaku=0&high_quality=1` : '',
    url: bvid ? `https://www.bilibili.com/video/${bvid}` : '#',
    publishedAt: v.created ? new Date(v.created * 1000).toISOString() : new Date().toISOString(),
    tags: ['B站', '视频'],
    source: source.name || 'B站'
  };
}

function biliItemFromSearch(v, source) {
  const bvid = v.bvid || '';
  const pic = normalizePic(v.pic);
  return {
    id: `bilis-${bvid || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'video',
    title: stripHtml(v.title || '(无标题)'),
    desc: stripHtml(v.description || v.title || '').slice(0, 140),
    body: stripHtml(v.description || v.title || ''),
    image: pic,
    embed: bvid ? `//player.bilibili.com/player.html?bvid=${bvid}&autoplay=0&danmaku=0&high_quality=1` : '',
    url: bvid ? `https://www.bilibili.com/video/${bvid}` : '#',
    publishedAt: v.pubdate ? new Date(v.pubdate * 1000).toISOString() : new Date().toISOString(),
    tags: ['B站', '视频', source.keyword].filter(Boolean),
    source: source.name || 'B站搜索'
  };
}

// 协议相对 (//xxx) 或 http: 转成 https:
function normalizePic(url) {
  if (!url) return '';
  if (url.startsWith('//')) return 'https:' + url;
  return url.replace(/^http:/, 'https:');
}

// ===  JSON API ===
async function fromJSON(source) {
  const controller = new AbortController();
  const res = await withTimeout(
    fetch(source.url, { headers: { 'User-Agent': UA }, signal: controller.signal }),
    3000,
    `json:${source.name || source.url}`
  );
  if (!res.ok) throw new Error(`json status ${res.status}`);
  const data = await res.json();
  const list = source.path ? getByPath(data, source.path) : data;
  if (!Array.isArray(list)) throw new Error('JSON path did not resolve to array');
  const limit = source.limit || 5;
  return list.slice(0, limit).map((row, i) => ({
    id: `json-${Date.now()}-${i}`,
    type: source.itemType || 'text',
    title: row.title || row.name || row.text || '(无标题)',
    desc: (row.desc || row.summary || row.content || '').toString().slice(0, 140),
    body: (row.body || row.content || row.text || '').toString(),
    image: row.image || row.cover || row.thumbnail || '',
    url: row.url || row.link || '#',
    publishedAt: row.publishedAt || row.date || new Date().toISOString(),
    tags: row.tags || [],
    source: source.name || 'JSON API'
  }));
}

// === helpers ===
function guessType(item) {
  if (item.enclosure && item.enclosure.type) {
    if (item.enclosure.type.startsWith('video')) return 'video';
    if (item.enclosure.type.startsWith('image')) return 'image_text';
  }
  if (item.content && /<img|<video/i.test(item.content)) return 'image_text';
  return 'text';
}

function stripHtml(s) {
  if (!s) return '';
  return s
    .toString()
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function pickImage(item) {
  if (item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('image')) {
    return item.enclosure.url;
  }
  if (item.mediaContent) return item.mediaContent;
  const m = (item.content || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function extractYTId(url) {
  if (!url) return '';
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? m[1] : '';
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

function toISO(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return '';
  return d.toISOString();
}

function prettyTitle(q, i) {
  const map = {
    sunrise: '清晨的第一缕光',
    happiness: '今天也要开心呀',
    gratitude: '心怀感恩,所遇皆温柔',
    smile: '你笑起来真好看',
    kindness: '善良,是世间最好的语言',
    hope: '愿你心中永远有光',
    nature: '走进自然,治愈一切'
  };
  return map[q] || `暖心时刻 #${i + 1}`;
}

function prettyDesc(q, i) {
  const map = {
    sunrise: '每一天的醒来,都是世界给我们最温柔的礼物。',
    happiness: '快乐其实很简单,它藏在每一个平凡的小瞬间里。',
    gratitude: '懂得感恩的人,世界会给他更多值得感恩的事。',
    smile: '你的笑容,可能刚刚温暖了某个陌生人的一天。',
    kindness: '一个善意的小动作,会在某处悄悄开出花来。',
    hope: '只要心里有光,脚下就有路,远方就不远。',
    nature: '山有山的巍峨,水有水的温柔,人也该有自己的节奏。'
  };
  return map[q] || '愿这一张图,能让你嘴角上扬。';
}

module.exports = {
  rss: fromRSS,
  unsplash: fromUnsplash,
  youtube_channel: fromYouTubeChannel,
  bilibili_user: fromBilibiliUser,
  bilibili_search: fromBilibiliSearch,
  json: fromJSON
};

// 根据 seed 生成稳定的双色渐变 SVG,作为离线场景的占位图
function gradientDataURL(seed = '', w = 800, h = 600) {
  let h1 = 0;
  for (let i = 0; i < seed.length; i++) h1 = (h1 * 31 + seed.charCodeAt(i)) >>> 0;
  const palettes = [
    ['#ffd1a4', '#ff9a76'],
    ['#ffe5b4', '#ffb997'],
    ['#fce4ec', '#f8bbd0'],
    ['#e1f5fe', '#b3e5fc'],
    ['#fff9c4', '#ffe082'],
    ['#f3e5f5', '#ce93d8'],
    ['#dcedc8', '#aed581'],
    ['#ffccbc', '#ff8a65'],
    ['#b2ebf2', '#4dd0e1'],
    ['#ffe0b2', '#ffb74d']
  ];
  const [c1, c2] = palettes[h1 % palettes.length];
  const angle = h1 % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1' gradientTransform='rotate(${angle} 0.5 0.5)'>
      <stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/>
    </linearGradient></defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <text x='50%' y='50%' text-anchor='middle' dy='.35em' font-family='-apple-system, sans-serif'
      font-size='${Math.floor(w / 18)}' fill='rgba(255,255,255,0.85)' font-weight='600'>${escapeXml(seed.split('-')[0] || '')}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
function escapeXml(s) { return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c])); }
