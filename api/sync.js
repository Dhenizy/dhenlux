const { redis, validEndpoint, hashEndpoint } = require("./_lib");

const TTL = 60 * 60 * 24 * 90; // forget phones that have not synced for 90 days

module.exports = async (req, res) => {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).json({ key: process.env.VAPID_PUBLIC_KEY || "" });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "GET or POST only" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const sub = body.subscription;
    if (!sub || !validEndpoint(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth)
      return res.status(400).json({ error: "Bad subscription" });

    const now = Date.now();
    const alarms = (Array.isArray(body.alarms) ? body.alarms : []).slice(0, 200).filter((a) =>
      a && typeof a.id === "string" && a.id.length <= 60 &&
      typeof a.at === "number" && a.at > now - 60000 && a.at < now + 1000 * 60 * 60 * 24 * 120 &&
      /^(d\d{1,2}|0|t)$/.test(a.kind) && typeof a.oid === "string" && a.oid.length <= 20
    ).map((a) => ({ id: a.id, at: a.at, kind: a.kind, oid: a.oid }));
        const h = hashEndpoint(sub.endpoint);
    const old = (await redis.get("al:" + h)) || [];
    if (old.length) await redis.zrem("due", ...old.map((a) => h + "|" + a.id));

    if (!alarms.length) {
      await redis.del("al:" + h, "sub:" + h);
      return res.status(200).json({ ok: true, count: 0 });
    }
    await redis.set("sub:" + h, { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, { ex: TTL });
    await redis.set("al:" + h, alarms, { ex: TTL });
    const members = alarms.map((a) => ({ score: a.at, member: h + "|" + a.id }));
    await redis.zadd("due", members[0], ...members.slice(1));
    res.status(200).json({ ok: true, count: alarms.length });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
};
