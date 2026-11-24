const { Redis } = require("@upstash/redis");
const crypto = require("crypto");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.STORAGE_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN,
});

// Only real browser push services are allowed, so this server cannot be used to call other sites.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /(^|\.)push\.apple\.com$/,
  /(^|\.)notify\.windows\.com$/,
];

function validEndpoint(ep) {
  try {
    const u = new URL(ep);
    return u.protocol === "https:" && PUSH_HOSTS.some((r) => r.test(u.hostname));
  } catch (e) { return false; }
}

const hashEndpoint = (ep) => crypto.createHash("sha256").update(ep).digest("hex").slice(0, 32);

function message(a) {
  const n = "Order #" + a.oid;
  if (a.kind === "t") return { title: "Dhenlux test reminder", body: "If you can see this, lock-screen reminders work." };
  if (a.kind === "0") return { title: "Pickup time now", body: n + " is due for pickup." };
  if (a.kind === "d1") return { title: "Pickup tomorrow", body: n + ". Is it ready?" };
  const d = a.kind.slice(1);
  return { title: d + " days to pickup", body: n + ". Start working on it now." };
}

module.exports = { redis, validEndpoint, hashEndpoint, message };
