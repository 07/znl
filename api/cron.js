// 定时任务入口 - Vercel Cron 每天 02:00 触发(vercel.json)
// 也支持手动 POST 触发(带 CRON_SECRET 鉴权)
//
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://xxx.vercel.app/api/cron
//   curl https://xxx.vercel.app/api/cron?secret=$CRON_SECRET  (GET, 仅用于测试)

const { runAll } = require('../lib/fetcher');
const storage = require('../lib/storage');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Vercel Cron 会带 Authorization: Bearer ${CRON_SECRET}
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const querySecret = (req.query && req.query.secret) || '';
  const expected = process.env.CRON_SECRET || '';
  if (expected && auth !== expected && querySecret !== expected) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const data = await runAll();
    const saved = await storage.save(data);
    res.status(200).json({
      ok: true,
      updatedAt: data.updatedAt,
      counts: {
        text: (data.text || []).length,
        image_text: (data.image_text || []).length,
        video: (data.video || []).length
      },
      errors: (data.errors || []).slice(0, 5),
      saved
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, stack: err.stack });
  }
};
