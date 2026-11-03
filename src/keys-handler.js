// "Testar chave": confere, sem gastar crédito de IA, se as chaves digitadas funcionam.
// Usa só rotas de consulta gratuitas dos provedores (lista de modelos; 1 unidade de cota no YouTube).
// As chaves chegam no corpo do pedido, são usadas uma vez e não são guardadas nem registradas em log.

import { validAiKeyShape, validYoutubeKeyShape, inferProvider } from "./user-keys.js";
import { aiPricingStatus } from "./ai-usage.js";

const DEFAULT_MODEL = { anthropic: "claude-sonnet-5-5", openai: "gpt-4o-mini" };

async function probe(fetchImpl, url, headers = {}) {
  try {
    const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(9000) });
    const payload = await response.json().catch(() => ({}));
    return { status: response.status, payload };
  } catch {
    return { status: 0, payload: {} };
  }
}

export async function testAiKey(provider, key, fetchImpl = globalThis.fetch) {
  if (!validAiKeyShape(key)) return { ok: false, message: "A chave parece incompleta ou tem caracteres que não pertencem a ela. Copie de novo, inteira." };
  const label = provider === "anthropic" ? "Anthropic" : "OpenAI";
  const result = provider === "anthropic"
    ? await probe(fetchImpl, "https://api.anthropic.com/v1/models?limit=1", { "x-api-key": key, "anthropic-version": "2023-06-01" })
    : await probe(fetchImpl, "https://api.openai.com/v1/models", { Authorization: `Bearer ${key}` });
  if (result.status === 200) return { ok: true, message: `Chave ${label} aceita.` };
  if (result.status === 401 || result.status === 403) return { ok: false, message: `A ${label} recusou esta chave. Confira se ela foi copiada inteira e se ainda está ativa no painel do provedor.` };
  if (result.status === 429) return { ok: true, message: `Chave ${label} aceita, mas o provedor está limitando o uso agora. Tente gerar um pouco mais tarde.` };
  if (result.status === 0) return { ok: false, message: `Não consegui falar com a ${label} agora. Tente de novo em instantes.` };
  return { ok: false, message: `A ${label} respondeu com um erro inesperado (HTTP ${result.status}).` };
}

export async function testYoutubeKey(key, fetchImpl = globalThis.fetch) {
  if (!key) return { ok: true, skipped: true, message: "Sem chave do YouTube: a busca de vídeos fica de fora, o resto funciona." };
  if (!validYoutubeKeyShape(key)) return { ok: false, message: "A chave do YouTube parece incompleta. Copie de novo, inteira." };
  const params = new URLSearchParams({ part: "id", id: "dQw4w9WgXcQ", key });
  const result = await probe(fetchImpl, `https://www.googleapis.com/youtube/v3/videos?${params}`);
  if (result.status === 200) return { ok: true, message: "Chave do YouTube aceita." };
  const reason = String(result.payload?.error?.errors?.[0]?.reason || result.payload?.error?.status || "");
  if (result.status === 400 && /keyinvalid|invalid_argument/i.test(reason)) return { ok: false, message: "O Google recusou esta chave do YouTube. Confira se ela foi copiada inteira." };
  if (result.status === 403) return { ok: false, message: /quota/i.test(reason) ? "Chave do YouTube válida, mas a cota diária acabou. Volte amanhã." : "A chave existe, mas a YouTube Data API v3 não está ativada neste projeto do Google Cloud." };
  if (result.status === 0) return { ok: false, message: "Não consegui falar com o YouTube agora. Tente de novo em instantes." };
  return { ok: false, message: `O YouTube respondeu com um erro inesperado (HTTP ${result.status}).` };
}

export async function testKeys(body = {}, fetchImpl = globalThis.fetch) {
  const aiKey = String(body.aiKey || "").trim();
  const youtubeKey = String(body.youtubeKey || "").trim();
  const provider = inferProvider(aiKey, body.provider);
  const ai = aiKey ? await testAiKey(provider, aiKey, fetchImpl) : { ok: false, message: "Informe a chave de IA (Anthropic ou OpenAI)." };
  const youtube = await testYoutubeKey(youtubeKey, fetchImpl);
  const model = DEFAULT_MODEL[provider];
  return { ok: ai.ok && youtube.ok, provider, model, ai, youtube, pricing: ai.ok ? await aiPricingStatus(model, fetchImpl) : null };
}

export default async function keysHandler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") return response.status(405).json({ ok: false, error: "Método não permitido." });
  const result = await testKeys(request.body || {});
  return response.status(200).json(result);
}
