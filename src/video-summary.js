// Resumo do vídeo (tópicos com tempo) para o bloco Vídeo do ClassAtelier.
//
// O ClassAtelier manda as falas da legenda com o tempo de cada uma ([[inicio, fim, "texto"], ...]).
// Aqui elas viram linhas "[m:ss] texto", a IA devolve seções com tópicos e o instante em que cada
// assunto começa, e o resultado volta como lista simples: [{ k: "h1"|"p", x: "texto", s: segundos|null }].
// Vídeos longos são divididos em partes (cada uma numa chamada), para caber no limite de tokens do pedido.
// Só roda quando o professor pede; usa a chave do servidor (com o código de acesso) ou a chave própria dele.

import { accessRequired, hasValidAccess } from "./access.js";
import { callJson, getAIModel, getAIProvider } from "./ai-client.js";
import { applyCors } from "./figure-handler.js";

export const SUMMARY_MAX_CUES = 8000;
export const SUMMARY_MAX_TEXT = 240000;
const PART_CHARS = 34000;     // ≈ 10 mil tokens de entrada por chamada
const MAX_PARTS = 4;          // ≈ 2 horas de fala
const LINE_SECONDS = 25;      // agrupa as falas em linhas de ~25 s

const SYSTEM = `Você resume vídeos de aula para estudantes. Recebe a transcrição de UM TRECHO do vídeo, em linhas com o tempo no começo: "[m:ss] fala" (ou "[h:mm:ss]"). Sua tarefa é produzir um resumo de estudo, em seções com tópicos curtos, para o aluno achar rápido cada assunto.

REGRAS
- Português do Brasil, no idioma da fala. Fiel ao que foi dito: não invente, não acrescente exemplos, números ou autores que a transcrição não traz. Use os termos técnicos como o professor usa.
- Seções: uma para cada bloco de assunto (em geral uma a cada 6–12 minutos do trecho; no mínimo 1, no máximo 8). Título curto (até 70 caracteres), sem numeração, nomeando o assunto (nada de "Introdução" solto quando o professor diz o assunto).
- Tópicos: de 2 a 6 por seção, cada um uma frase completa de até 170 caracteres, na ordem em que aparecem. Cada tópico traz "start": o instante, em SEGUNDOS, em que aquele assunto começa, copiado de uma das marcas do trecho. A seção começa no "start" do seu primeiro tópico.
- Ignore enrolação, cumprimentos, pedidos de "curtir e se inscrever" e trechos de música ou ruído como [Música].
- Se o trecho não traz marcas de tempo, omita "start".

FORMATO: somente JSON válido, sem comentários: {"sections":[{"title":"Álgebra relacional: seleção e projeção","points":[{"start":395,"text":"A seleção (sigma) escolhe as tuplas que cumprem um predicado."},{"start":660,"text":"A projeção (pi) mantém só os atributos pedidos e elimina duplicatas."}]}]}`;

const clip = (value, size) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, size);

export function formatMark(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

// Falas [[inicio, fim, texto]] → linhas "[m:ss] texto" de ~25 s cada. Devolve { lines, duration }.
export function buildTimedLines(cues = []) {
  const valid = (Array.isArray(cues) ? cues : [])
    .map((c) => (Array.isArray(c) ? [Number(c[0]), Number(c[1]), clip(c[2], 400)] : null))
    .filter((c) => c && Number.isFinite(c[0]) && c[0] >= 0 && c[2])
    .sort((a, b) => a[0] - b[0]);
  const lines = [];
  let start = null, text = "";
  for (const c of valid) {
    if (start === null) { start = c[0]; text = c[2]; continue; }
    if (c[0] - start >= LINE_SECONDS) { lines.push(`[${formatMark(start)}] ${text}`); start = c[0]; text = c[2]; }
    else text += " " + c[2];
  }
  if (start !== null) lines.push(`[${formatMark(start)}] ${text}`);
  const duration = valid.length ? Math.max(...valid.map((c) => (Number.isFinite(c[1]) ? c[1] : c[0]))) : 0;
  return { lines, duration };
}

// Divide as linhas em partes que cabem em uma chamada.
export function splitParts(lines, maxChars = PART_CHARS) {
  const parts = [];
  let current = [], size = 0;
  for (const line of lines) {
    if (current.length && size + line.length > maxChars) { parts.push(current); current = []; size = 0; }
    current.push(line); size += line.length + 1;
  }
  if (current.length) parts.push(current);
  return parts;
}

// Resposta da IA → lista simples de itens, com tempos conferidos.
export function normalizeSummary(raw, { duration = 0 } = {}) {
  const sections = Array.isArray(raw?.sections) ? raw.sections : [];
  const limit = duration > 0 ? duration + 5 : Infinity;
  const time = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= limit ? Math.round(n) : null;
  };
  const items = [];
  sections.slice(0, 12).forEach((section) => {
    const title = clip(section?.title, 90);
    const points = (Array.isArray(section?.points) ? section.points : [])
      .map((p) => ({ x: clip(p?.text ?? p, 220), s: time(p?.start) }))
      .filter((p) => p.x)
      .slice(0, 10);
    if (!title && !points.length) return;
    // Pontos em ordem de tempo (os sem tempo ficam onde estavam).
    const timed = points.filter((p) => p.s !== null).sort((a, b) => a.s - b.s);
    let at = 0;
    const ordered = points.map((p) => (p.s === null ? p : timed[at++]));
    items.push({ k: "h1", x: title || "Resumo", s: ordered.find((p) => p.s !== null)?.s ?? null });
    ordered.forEach((p) => items.push({ k: "p", x: p.x, s: p.s }));
  });
  return items;
}

export async function summarizeVideo({ cues, text, language = "pt" } = {}, ask = callJson) {
  let lines, duration = 0;
  if (Array.isArray(cues) && cues.length) {
    if (cues.length > SUMMARY_MAX_CUES) { const e = new Error("A legenda tem falas demais para resumir de uma vez (limite de " + SUMMARY_MAX_CUES + ")."); e.code = "SUMMARY_TOO_LONG"; e.status = 413; throw e; }
    ({ lines, duration } = buildTimedLines(cues));
  } else {
    const plain = String(text || "").replace(/\r/g, "").split(/\n\s*\n/).map((p) => clip(p, 1500)).filter(Boolean);
    lines = plain;
  }
  if (lines.join(" ").length < 400) { const e = new Error("A transcrição é curta demais para resumir (menos de 400 caracteres)."); e.code = "SUMMARY_SHORT"; e.status = 400; throw e; }
  const parts = splitParts(lines);
  if (parts.length > MAX_PARTS) { const e = new Error("O vídeo é longo demais para resumir de uma vez (acima de cerca de 2 horas de fala). Resuma em duas partes."); e.code = "SUMMARY_TOO_LONG"; e.status = 413; throw e; }
  const items = [];
  for (let i = 0; i < parts.length; i += 1) {
    const note = parts.length > 1 ? `\n(Trecho ${i + 1} de ${parts.length} do vídeo.)` : "";
    const raw = await ask([
      { role: "system", content: SYSTEM },
      { role: "user", content: `Idioma do vídeo: ${clip(language, 8) || "pt"}.${note}\n\nTRANSCRIÇÃO DO TRECHO:\n${parts[i].join("\n")}` }
    ], { temperature: 0.2, maxTokens: 3500, retryMaxTokens: 5000, label: "videosummary", formatRetryInstruction: "Devolva novamente somente o objeto JSON com a lista sections." });
    items.push(...normalizeSummary(raw, { duration }));
  }
  if (!items.some((item) => item.k === "p")) { const e = new Error("A IA não devolveu tópicos. Tente de novo."); e.code = "SUMMARY_EMPTY"; e.status = 502; throw e; }
  return { items, parts: parts.length };
}

// Rota para o ClassAtelier (editor em outro endereço, por isso CORS). Não é função própria (limite de 12 no
// plano Hobby): api/regenerate-week.js despacha action "videosummary".
export default async function videoSummaryHandler(request, response, { ask = callJson } = {}) {
  response.setHeader("Cache-Control", "no-store");
  const known = applyCors(request, response);
  if (request.method === "OPTIONS") return response.status(known ? 204 : 403).end();
  if (request.headers?.origin && !known) return response.status(403).json({ ok: false, error: "Este endereço não tem permissão para pedir resumos ao ClassAuthor.", code: "SUMMARY_ORIGIN" });
  if (request.method !== "POST") return response.status(405).json({ ok: false, error: "Método não permitido." });
  if (accessRequired() && !hasValidAccess(request)) return response.status(401).json({ ok: false, error: "Código de acesso do ClassAuthor ausente ou incorreto.", code: "SUMMARY_ACCESS" });
  try {
    const body = request.body || {};
    if (String(body.text || "").length > SUMMARY_MAX_TEXT) { const e = new Error("A transcrição é grande demais para resumir de uma vez."); e.code = "SUMMARY_TOO_LONG"; e.status = 413; throw e; }
    const result = await summarizeVideo({ cues: body.cues, text: body.text, language: body.language }, ask);
    return response.status(200).json({ ok: true, provider: "ai-videosummary", aiProvider: getAIProvider(), model: getAIModel(), ...result });
  } catch (error) {
    if (!/^SUMMARY_/.test(error.code || "")) console.error("videosummary failed", error);
    const status = error.status || (error.code === "AI_KEY_MISSING" ? 503 : error.code === "AI_TPM_LIMIT" ? 429 : error.code === "AI_PROVIDER_ERROR" ? 502 : error.code === "AI_REQUEST_TOO_LARGE" ? 413 : 400);
    return response.status(status).json({ ok: false, error: error.message || "Não foi possível resumir o vídeo.", code: error.code || "SUMMARY_ERROR", retryable: Boolean(error.retryable) });
  }
}
