// 兜底正能量短句库 - 当所有外部源都失败时使用,保证网站永远有内容
// 短句按主题分类,fetch 时按需取

const QUOTES = [
  { text: '愿你眼里有光,心中有暖,脚下有力。', author: '佚名' },
  { text: '今天也要加油呀,每一个清晨都是新的开始。', author: '佚名' },
  { text: '慢一点也没关系,只要一直在向前。', author: '佚名' },
  { text: '把每一个平凡的日子都过得不平凡。', author: '佚名' },
  { text: '善良是一种选择,也终将回到你身上。', author: '佚名' },
  { text: '心若向阳,无谓悲伤。', author: '海子化用' },
  { text: '愿你成为自己的太阳,无需凭借谁的光。', author: '卢思浩' },
  { text: '好好生活,慢慢相遇。', author: '佚名' },
  { text: '愿你历尽千帆,归来仍是少年。', author: '佚名' },
  { text: '热爱可抵岁月漫长。', author: '佚名' },
  { text: '你要相信,一切都是最好的安排。', author: '佚名' },
  { text: '做一个温暖的人,用自己的光照亮自己。', author: '佚名' },
  { text: '越努力,越幸运;越自律,越自由。', author: '佚名' },
  { text: '心有所信,方能行远。', author: '李大钊' },
  { text: '愿你的世界里,鲜花常开,清风徐来。', author: '佚名' },
  { text: '每一份付出,都不会被辜负。', author: '佚名' },
  { text: '保持热爱,奔赴山海。', author: '佚名' },
  { text: '总有不期而遇的温暖,和生生不息的希望。', author: '佚名' },
  { text: '愿你成为自己喜欢的样子,不畏将来,不念过往。', author: '丰子恺' },
  { text: '生活明朗,万物可爱,人间值得,未来可期。', author: '佚名' },
  { text: '与其追逐远方,不如把眼前过成诗。', author: '佚名' },
  { text: '心怀暖阳,何惧人生荒凉。', author: '佚名' },
  { text: '愿你眼里有星辰,大海,和繁花似锦的明天。', author: '佚名' },
  { text: '保持微笑,因为生活偏爱那些笑着面对的人。', author: '佚名' },
  { text: '做一个眼里有故事,脸上不见风霜的人。', author: '佚名' },
  { text: '愿你一生有山可靠,有树可栖,有雨可听。', author: '佚名' },
  { text: '善良比聪明更难得,愿你一直善良。', author: '佚名' },
  { text: '愿你走过半生,归来仍有赤子之心。', author: '佚名' },
  { text: '温柔半两,从容一生。', author: '佚名' },
  { text: '别让生活耗尽你的耐心和向往。', author: '佚名' }
];

const IMAGE_CARDS = [
  { title: '清晨的微光', desc: '当第一缕阳光洒进窗台,世界又开始温柔地拥抱你。' },
  { title: '山间清风', desc: '走一段山,看一程云,把烦恼交给风。' },
  { title: '一杯热茶', desc: '热气腾腾的茶,藏着生活里最朴素的小确幸。' },
  { title: '海边日落', desc: '把心事说给夕阳听,它会还你一片温柔的橘。' },
  { title: '窗外的花', desc: '不必远行,身边的小花就是最好的诗意。' },
  { title: '一本旧书', desc: '翻开的每一页,都是与温暖的不期而遇。' },
  { title: '街角的猫', desc: '愿你也能找到让自己安心的那个角落。' },
  { title: '雪后初晴', desc: '世界安静下来,只剩下雪落下的声音。' },
  { title: '夜空的星', desc: '抬头看看吧,总有一颗是为你而亮的。' }
];

const VIDEOS = [
  {
    title: 'TED: 感恩的力量',
    desc: '用 5 分钟理解感恩如何重塑我们的大脑与生活。',
    embed: 'https://www.youtube.com/embed/WPPQX7tLy28',
    source: 'TED'
  },
  {
    title: '早晨 5 分钟正念冥想',
    desc: '跟随呼吸,把心带回到当下,迎接崭新的一天。',
    embed: 'https://www.youtube.com/invoke?video_search=guided%20meditation%205%20min%20morning',
    source: 'YouTube'
  },
  {
    title: '一首温暖的歌,陪你度过这个下午',
    desc: '音乐是最轻的拥抱,愿这一首歌让你嘴角上扬。',
    embed: '',
    source: '音乐'
  }
];

function pickQuotes(n) {
  return shuffle(QUOTES).slice(0, n).map((q, i) => ({
    id: `quote-${Date.now()}-${i}`,
    type: 'text',
    title: q.text,
    desc: q.text.length > 36 ? q.text.slice(0, 36) + '…' : q.text,
    body: q.text,
    author: q.author,
    url: '#',
    publishedAt: new Date().toISOString(),
    tags: ['暖心', '语录'],
    source: '正能量短句库'
  }));
}

function pickCards(n) {
  return shuffle(IMAGE_CARDS).slice(0, n).map((c, i) => ({
    id: `card-${Date.now()}-${i}`,
    type: 'image_text',
    title: c.title,
    desc: c.desc,
    body: c.desc,
    image: `https://picsum.photos/seed/${encodeURIComponent(c.title)}/800/600`,
    fallbackImage: gradientDataURL(c.title, 800, 600),
    url: '#',
    publishedAt: new Date().toISOString(),
    tags: ['图文', '治愈'],
    source: '治愈卡片库'
  }));
}

function pickVideos(n) {
  return shuffle(VIDEOS).slice(0, n).map((v, i) => ({
    id: `video-${Date.now()}-${i}`,
    type: 'video',
    title: v.title,
    desc: v.desc,
    body: v.desc,
    image: `https://picsum.photos/seed/${encodeURIComponent(v.title)}/800/450`,
    fallbackImage: gradientDataURL(v.title, 800, 450),
    embed: v.embed,
    url: v.embed || '#',
    publishedAt: new Date().toISOString(),
    tags: ['视频', '励志'],
    source: v.source
  }));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gradientDataURL(seed = '', w = 800, h = 450) {
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
      font-size='${Math.floor(w / 18)}' fill='rgba(255,255,255,0.85)' font-weight='600'>${escapeXml(seed.split(/[-—_]/)[0] || '')}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
function escapeXml(s) { return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c])); }

module.exports = { pickQuotes, pickCards, pickVideos, gradientDataURL };
