const webpush = require("web-push");
const crypto = require("crypto");
const { redis, message } = require("./_lib");

const MAX_LATE = 6 * 60 * 60 * 1000; // do not send reminders that are more than 6 hours late

function authorised(req) {
  const secret = process.env.CRON_SECRET || "";
  const given = (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || (req.query && req.query.key) || "";
  const a = Buffer.from(String(given)), b = Buffer.from(secret);
  return secret.length >= 16 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  if (!authorised(req)) return res.status(401).json({ error: "Unauthorised" });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const now = Date.now();
  let sent = 0, failed = 0, dropped = 0;
  const members = await redis.zrange("due", 0, now, { byScore: true, offset: 0, count: 200 });
  const cache = {};
  for (const m of members) {
    const h = m.slice(0, 32), id = m.slice(33);
    if (!cache[h]) cache[h] = { sub: await redis.get("sub:" + h), al: (await redis.get("al:" + h)) || [] };
    const { sub, al } = cache[h];
    const a = al.find((x) => x.id === id);
    if (!sub || !a || a.at < now - MAX_LATE) { await redis.zrem("due", m); dropped++; continue; }
    try {
      const msg = message(a);
      await webpush.sendNotification(sub, JSON.stringify({ title: msg.title, body: msg.body, tag: "dhenlux-" + a.oid }), { TTL: 3600, urgency: "high" });
      await redis.zrem("due", m); sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { await redis.del("sub:" + h, "al:" + h); await redis.zrem("due", m); dropped++; }
      else failed++; // stays in the queue and is retried on the next run
    }
  }
  res.status(200).json({ checked: members.length, sent, failed, dropped });
};
