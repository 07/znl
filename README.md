# 🌞 小确幸 · 每日正能量

一个温暖治愈的"正能量"内容站,每天自动给你:

- 📝 **暖心文字** — 短句 / 鸡汤 / 语录
- 🖼️ **治愈图文** — 暖色图片 + 治愈文案
- 🎬 **励志视频** — 短视频 / 演讲 / 音乐

> 用户零运维 — 改一个 `config.json` 就能加内容源,定时任务自动跑,部署到 Vercel 全程免费。

---

## ✨ 效果预览

| 暖心文字 | 治愈图文 | 励志视频 |
| :---: | :---: | :---: |
| 三栏大字居中卡片 | 真实图片 + 描述 | 缩略图 + 弹窗播放 |

---

## 🚀 一键部署到 Vercel(推荐路径)

整个项目是 **零依赖** 的(只用 Node 18+ 内置 `fetch`)。Vercel 免费版完全够用。

### 步骤 1:推到 GitHub

```bash
# 在 GitHub 创建一个新仓库(空仓库),比如 positive-energy-site
git init
git add .
git commit -m "init: positive energy site"
git branch -M main
git remote add origin git@github.com:你的用户名/positive-energy-site.git
git push -u origin main
```

### 步骤 2:Vercel 导入项目

1. 打开 https://vercel.com/new
2. 选 `Import Git Repository` → 选刚推的仓库
3. Framework Preset 选 **Other**(默认即可)
4. 点 **Deploy** — 等 1 分钟,你会拿到 `https://xxx.vercel.app`

部署完打开就能看到内容,**完全不需要额外配置**。

### 步骤 3(可选):开启 GitHub Actions 自动抓取

仓库里已经内置了 `.github/workflows/fetch.yml`,**只要 push 到 GitHub 就会自动启用**,每天 UTC 18:00(北京时间凌晨 2 点)抓一次,自动提交 `public/data/contents.json` 并触发 Vercel 重新部署。

> 想立刻抓一次?进仓库 → Actions → "Fetch Daily Positive Energy" → Run workflow。

**这就是最便宜的方案**:GitHub Actions 免费 + Vercel 免费,完全够个人 / 小流量用。

---

## 🔧 配置内容采集源

只需要改 `config.json` 一个文件,不用动代码。

```jsonc
{
  "settings": {
    "perCategory": 3,        // 每个 tab 想显示几条
    "perCategoryMax": 10,    // 硬上限
    "maxAge": 7              // 几天内的内容算"新鲜"
  },
  "categories": {
    "text":       { "label": "暖心文字", "sources": [ /* 文字源 */ ] },
    "image_text": { "label": "治愈图文", "sources": [ /* 图文源 */ ] },
    "video":      { "label": "励志视频", "sources": [ /* 视频源 */ ] }
  }
}
```

### 支持的 source 类型

| `type` | 用途 | 关键字段 |
| --- | --- | --- |
| `rss` | 任何 RSS / Atom 源 | `url`, `limit`, `name` |
| `unsplash` | 按关键词生成图卡(Picsum 免 key) | `queries: ["sunrise", "kindness", …]`, `limit` |
| `youtube_channel` | YouTube 频道最新视频(免 API key) | `channelId`, `limit` |
| `json` | 任意 JSON API,用 `path` 取数组 | `url`, `path` (例 `"data.items"`), `itemType` |
| `fallback_quotes` | 内置正能量短句(网络挂掉时兜底) | `limit` |
| `fallback_cards` | 内置治愈图文卡(兜底) | `limit` |
| `fallback_videos` | 内置视频卡(兜底) | `limit` |

### 例子:加一个"人民日报金句"文字源

```jsonc
"text": {
  "sources": [
    { "type": "rss", "name": "人民日报金句", "url": "https://...", "limit": 5 }
  ]
}
```

### 例子:加一个自定义 JSON API 图文源

```jsonc
{
  "type": "json",
  "name": "我的 API",
  "url": "https://example.com/api/list",
  "path": "data.items",          // 点路径取数组
  "itemType": "image_text",
  "limit": 5
}
```

API 返回结构期望(字段缺失会用空值):
```json
{ "data": { "items": [
  { "title": "...", "desc": "...", "image": "...", "url": "...", "publishedAt": "...", "tags": ["..."] }
]}}
```

### 兜底机制

- 任何外部源**抓取失败**(超时 / 404 / 解析错误)不会让网站空白
- 自动用内置的**正能量短句库 / 治愈卡 / 视频卡**补齐
- 所以即使你什么都不配,网站也永远有 9 条内容

---

## 🧪 本地开发

```bash
npm install                # 装 Node 18+ 自带的 fetch 即可,无第三方依赖
npm run dev                # 起本地服务 → http://localhost:3000
npm run fetch              # 本地手动跑一次抓取
npm run fetch:all          # 抓 10 条
```

---

## ⏰ 自动抓取的两种方案(任选其一)

### 方案 A:GitHub Actions(默认,推荐)

仓库里的 `.github/workflows/fetch.yml` 已经配好,push 到 GitHub 就会自动跑:

- 每天 UTC 18:00 跑一次(北京时间凌晨 2 点)
- 内容有变化就 `git commit + push`,触发 Vercel 重新部署
- 完全免费

### 方案 B:Vercel Cron Jobs + Vercel KV(高级)

`vercel.json` 里已经配了 `crons: [{ path: "/api/cron", schedule: "0 2 * * *" }]`。
Vercel 会每天 02:00 调一次 `api/cron.js`。

但 Vercel Serverless Function **不能写本地文件**,所以这个方案需要:

1. Vercel 项目里创建一个 **KV Store** (Storage → Create Database → KV)
2. 不用额外配环境变量,Vercel 会自动注入
3. `api/cron.js` 会自动检测 `KV_REST_API_URL` 并写入 KV

> Hobby 计划(免费)每天只能跑一次 cron(刚好),所以方案 A + GitHub Actions 是更稳的默认。

---

## 📁 目录结构

```
positive-energy-site/
├── api/                       # Vercel Serverless Functions
│   ├── contents.js            # GET /api/contents — 前端拉数据用
│   └── cron.js                # 定时任务入口 — 自动抓取
├── lib/                       # 共享逻辑
│   ├── fetcher.js             # 抓取编排
│   ├── sources.js             # 各种 source type 的解析器
│   ├── quoteBank.js           # 兜底正能量短句库
│   └── storage.js             # KV / 本地文件 存储抽象
├── public/                    # 静态资源
│   ├── index.html             # 主页
│   ├── css/style.css          # 样式
│   ├── js/app.js              # 前端逻辑
│   └── data/contents.json     # 抓取结果(被 git 跟踪)
├── scripts/
│   ├── fetch.js               # CLI 抓取脚本(GitHub Actions 用)
│   ├── seed.js                # 生成初始内容
│   ├── serve.js               # 本地 dev server
│   └── shot.js                # 截图工具(开发用)
├── .github/workflows/
│   └── fetch.yml              # 每天自动抓取 + 提交
├── config.json                # ★ 改这一个文件就能加内容源
├── vercel.json                # Vercel 路由 + Cron 配置
├── package.json
└── README.md
```

---

## 🎨 自定义外观

- 改色:`public/css/style.css` 顶部的 `:root` 变量
- 改标题/副标题:`public/index.html` 的 `<header class="hero">`
- 改 tab 顺序:HTML 里调换 `.tab` 顺序即可

---

## 🛡️ License

MIT — 随便用,做点让自己开心的小项目吧 🌷
