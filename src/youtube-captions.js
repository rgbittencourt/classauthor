// Legendas do YouTube → texto de transcrição (para o bloco de vídeo do ClassAtelier).
//
// Lê as faixas de legenda que o próprio YouTube publica para o vídeo (manuais ou automáticas) e as
// transforma em parágrafos. Não usa IA e não gera custo. Quando o vídeo não tem legenda, avisa.
// A rede entra por `fetchImpl`, para os testes não dependerem do YouTube.

const PLAYER_URL = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
// O YouTube recusa com frequência pedidos vindos de servidores (IPs de datacenter). Por isso o pedido
// é tentado com mais de um "cliente" do YouTube, um após o outro, até algum aceitar.
const CLIENTS = [
  { id: 3, ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip", client: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 34, hl: "pt", gl: "BR" } },
  { id: 5, ua: "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)", client: { clientName: "IOS", clientVersion: "20.10.4", deviceMake: "Apple", deviceModel: "iPhone16,2", osName: "iPhone", osVersion: "18.3.2.22D82", hl: "pt", gl: "BR" } },
  { id: 28, ua: "com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip", client: { clientName: "ANDROID_VR", clientVersion: "1.62.27", deviceMake: "Oculus", deviceModel: "Quest 3", androidSdkVersion: 32, osName: "Android", osVersion: "12L", hl: "pt", gl: "BR" } },
  { id: 85, ua: "Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version", client: { clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", clientVersion: "2.0", hl: "pt", gl: "BR" }, embed: true }
];
const UA = CLIENTS[0].ua;
const BOT = /login|sign in|bot|confirm/i;

export class CaptionsError extends Error {
  constructor(message, code, status = 502) { super(message); this.code = code; this.status = status; }
}

// Aceita o ID de 11 caracteres ou qualquer endereço de vídeo (watch, youtu.be, embed, shorts).
export function extractVideoId(value) {
  const text = String(value || "").trim();
  if (/^[\w-]{11}$/.test(text)) return text;
  const match = text.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return match ? match[1] : "";
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export function decodeEntities(text) {
  // O YouTube às vezes codifica duas vezes (&amp;#39;), por isso duas passadas.
  const once = (value) => String(value).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name) => {
    if (name[0] === "#") {
      const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[name.toLowerCase()] ?? match;
  });
  return once(once(text));
}

// Entende os dois formatos do YouTube: <transcript><text start dur> (segundos) e <timedtext format="3"><p t d> (ms).
export function parseCaptionXml(xml) {
  const cues = [];
  const source = String(xml || "");
  for (const match of source.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const start = Number(/\bt="(\d+)"/.exec(match[1])?.[1]);
    const dur = Number(/\bd="(\d+)"/.exec(match[1])?.[1] || 0);
    const text = clean(match[2]);
    if (text) cues.push({ start: Number.isFinite(start) ? start / 1000 : null, end: Number.isFinite(start) ? (start + dur) / 1000 : null, text });
  }
  if (cues.length) return cues;
  for (const match of source.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const start = Number(/\bstart="([\d.]+)"/.exec(match[1])?.[1]);
    const dur = Number(/\bdur="([\d.]+)"/.exec(match[1])?.[1] || 0);
    const text = clean(match[2]);
    if (text) cues.push({ start: Number.isFinite(start) ? start : null, end: Number.isFinite(start) ? start + dur : null, text });
  }
  return cues;
}

function clean(raw) {
  return decodeEntities(String(raw).replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

// Junta as falas em parágrafos: quebra em pausas longas (3 s) ou quando o trecho já está grande e uma frase termina.
export function cuesToParagraphs(cues, { softLimit = 420, hardLimit = 760, pause = 3 } = {}) {
  const paragraphs = [];
  let current = "";
  let lastEnd = null;
  for (const cue of cues) {
    const gap = lastEnd != null && cue.start != null ? cue.start - lastEnd : 0;
    if (current && (gap >= pause || current.length >= hardLimit || (current.length >= softLimit && /[.!?…]["”')]*$/.test(current)))) {
      paragraphs.push(current);
      current = "";
    }
    current = current ? `${current} ${cue.text}` : cue.text;
    if (cue.end != null) lastEnd = cue.end;
  }
  if (current) paragraphs.push(current);
  return paragraphs;
}

// Faixa preferida: legenda feita por pessoa no idioma pedido, depois automática no idioma, depois inglês, depois a primeira.
export function pickTrack(tracks, language = "pt") {
  const list = Array.isArray(tracks) ? tracks.filter((track) => track?.baseUrl) : [];
  const lang = String(language || "pt").toLowerCase();
  const isAuto = (track) => track.kind === "asr";
  const same = (track, code) => String(track.languageCode || "").toLowerCase().split("-")[0] === code;
  return list.find((t) => same(t, lang) && !isAuto(t))
    || list.find((t) => same(t, lang))
    || list.find((t) => same(t, "en") && !isAuto(t))
    || list.find((t) => same(t, "en"))
    || list[0]
    || null;
}

const trackName = (track) => track.name?.simpleText || track.name?.runs?.map((run) => run.text).join("") || track.languageCode || "";

export async function fetchYouTubeTranscript(videoInput, { language = "pt", fetchImpl = globalThis.fetch, timeoutMs = 12000 } = {}) {
  const videoId = extractVideoId(videoInput);
  if (!videoId) throw new CaptionsError("Informe o endereço ou o código do vídeo do YouTube (11 caracteres).", "CAPTIONS_ID", 400);
  const call = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fetchImpl(url, { ...options, signal: controller.signal }); }
    catch (error) { throw new CaptionsError("Não consegui falar com o YouTube agora. Tente de novo em instantes ou cole a transcrição à mão.", "CAPTIONS_NETWORK"); }
    finally { clearTimeout(timer); }
  };
  // Tenta cada cliente até um devolver o vídeo liberado; guarda o motivo da última recusa.
  let player = null;
  let refusal = null;
  let usedUa = UA;
  for (const option of CLIENTS) {
    let response;
    try {
      response = await call(PLAYER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": option.ua, "Accept-Language": "pt-BR,pt;q=0.9", "X-YouTube-Client-Name": String(option.id), "X-YouTube-Client-Version": option.client.clientVersion },
        body: JSON.stringify({ context: { client: option.client, ...(option.embed ? { thirdParty: { embedUrl: "https://www.youtube.com/" } } : {}) }, videoId, contentCheckOk: true, racyCheckOk: true })
      });
    } catch (error) { refusal = refusal || error; continue; }
    if (!response.ok) { refusal = new CaptionsError("O YouTube não respondeu ao pedido das legendas (erro " + response.status + "). Cole a transcrição à mão.", "CAPTIONS_BLOCKED"); continue; }
    let body;
    try { body = await response.json(); } catch (error) { refusal = new CaptionsError("O YouTube respondeu em um formato inesperado. Cole a transcrição à mão.", "CAPTIONS_BLOCKED"); continue; }
    const status = body?.playabilityStatus?.status;
    if (status && status !== "OK") {
      const reason = body.playabilityStatus.reason || "";
      const bot = BOT.test(reason) || status === "LOGIN_REQUIRED";
      refusal = new CaptionsError(bot ? "O YouTube bloqueou o pedido automático. Cole a transcrição à mão." : `O vídeo não está disponível${reason ? ` (${reason})` : ""}.`, "CAPTIONS_UNAVAILABLE", bot ? 502 : 404);
      // Vídeo realmente indisponível (privado, removido): outro cliente não resolve.
      if (!bot) break;
      continue;
    }
    player = body;
    usedUa = option.ua;
    // Aceito, mas sem faixas: tenta o próximo cliente antes de concluir que o vídeo não tem legenda.
    if (body?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length) break;
  }
  if (!player) throw refusal || new CaptionsError("Não consegui falar com o YouTube agora. Cole a transcrição à mão.", "CAPTIONS_NETWORK");
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const track = pickTrack(tracks, language);
  if (!track) throw new CaptionsError("Este vídeo não tem legendas publicadas. Ative as legendas automáticas no YouTube Studio (ou cole a transcrição à mão).", "CAPTIONS_NONE", 404);
  const captionUrl = String(track.baseUrl).replace(/&fmt=[^&]*/g, "");
  if (!/^https:\/\/(www\.)?youtube\.com\//.test(captionUrl)) throw new CaptionsError("Endereço de legenda inesperado.", "CAPTIONS_BLOCKED");
  const captionResponse = await call(captionUrl, { headers: { "User-Agent": usedUa, "Accept-Language": "pt-BR,pt;q=0.9" } });
  if (!captionResponse.ok) throw new CaptionsError("Não consegui baixar a legenda (erro " + captionResponse.status + "). Cole a transcrição à mão.", "CAPTIONS_BLOCKED");
  const cues = parseCaptionXml(await captionResponse.text());
  if (!cues.length) throw new CaptionsError("A legenda veio vazia. Cole a transcrição à mão.", "CAPTIONS_NONE", 404);
  const paragraphs = cuesToParagraphs(cues);
  return {
    videoId,
    text: paragraphs.join("\n\n"),
    paragraphs: paragraphs.length,
    characters: paragraphs.join("").length,
    language: track.languageCode || "",
    languageName: trackName(track),
    auto: track.kind === "asr",
    tracks: tracks.map((item) => ({ language: item.languageCode || "", name: trackName(item), auto: item.kind === "asr" }))
  };
}
