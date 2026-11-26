const TRACKING_KEYS = new Set([
  "fbclid", "gclid", "dclid", "gbraid", "wbraid", "mc_cid", "mc_eid",
  "igshid", "ref_src", "ref_url", "si", "feature"
]);
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "youtube-nocookie.com", "youtu.be"]);

function parseHttpUrl(value) {
  let raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\/\//.test(raw)) raw = `https:${raw}`;
  else if (!/^https?:\/\//i.test(raw) && /^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(raw)) raw = `https://${raw}`;
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function isYouTubeHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return [...YOUTUBE_HOSTS].some((base) => host === base || host.endsWith(`.${base}`));
}

export function isYouTubeVideoId(value) {
  return YOUTUBE_ID_PATTERN.test(String(value ?? "").trim());
}

export function youtubeVideoId(value) {
  const raw = String(value ?? "").trim();
  if (isYouTubeVideoId(raw)) return raw;
  const url = parseHttpUrl(raw);
  if (!url || !isYouTubeHost(url.hostname)) return "";

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let candidate = "";
  if (host === "youtu.be") candidate = url.pathname.split("/").filter(Boolean)[0] || "";
  else if (url.pathname === "/watch") candidate = url.searchParams.get("v") || "";
  else candidate = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/i)?.[1] || "";
  return isYouTubeVideoId(candidate) ? candidate : "";
}

export function canonicalResourceUrl(value) {
  const url = parseHttpUrl(value);
  if (!url) return "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || TRACKING_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  return url.toString();
}

export function resourceIdentity(value, kind = "") {
  const videoId = youtubeVideoId(value);
  if (videoId) return `youtube:${videoId}`;
  const canonical = canonicalResourceUrl(value);
  return canonical ? `url:${canonical}` : "";
}

export function resourceItemIdentity(item = {}, kind = "") {
  const source = item && typeof item === "object" ? item : {};
  const identity = resourceIdentity(source.href || source.link || source.url, kind || source.type || source.kind);
  if (identity) return identity;
  const id = String(source.id ?? "").trim();
  return id ? `id:${id}` : "";
}

export function extractHrefFromMarkup(value) {
  const source = String(value ?? "");
  const match = source.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const href = match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
  return href.replace(/&amp;/gi, "&").replace(/&#x2f;/gi, "/").replace(/&#x3a;/gi, ":").replace(/&quot;/gi, '"').trim();
}
