// Chaves de API próprias, enviadas pela pessoa a cada pedido (cabeçalhos x-aula-*).
// Nada é gravado em disco, em variável global nem em log: a chave vive só no contexto da requisição
// (AsyncLocalStorage) e some quando a resposta é enviada.
//
// Regra de uso das chaves do servidor (variáveis de ambiente):
//  - com o código de acesso certo (ou servidor sem código): valem as chaves do servidor, a menos que a
//    pessoa envie a sua, que então tem preferência;
//  - sem o código: o servidor NUNCA usa as próprias chaves; só vale o que a pessoa enviou.

import { AsyncLocalStorage } from "node:async_hooks";

const store = new AsyncLocalStorage();

// Só caracteres que as chaves reais usam: impede injeção de cabeçalho e lixo.
const AI_KEY = /^[A-Za-z0-9._-]{16,300}$/u;
const YOUTUBE_KEY = /^[A-Za-z0-9._-]{16,120}$/u;

function header(request, name) {
  const value = request?.headers?.[name];
  const text = Array.isArray(value) ? value[0] : value;
  return typeof text === "string" ? text.trim() : "";
}

export function inferProvider(aiKey, declared) {
  const wanted = String(declared || "").trim().toLowerCase();
  if (wanted === "anthropic" || wanted === "claude") return "anthropic";
  if (wanted === "openai") return "openai";
  return /^sk-ant-/u.test(aiKey || "") ? "anthropic" : "openai";
}

export function readUserKeys(request) {
  const rawAi = header(request, "x-aula-ai-key");
  const rawYoutube = header(request, "x-aula-youtube-key");
  const aiKey = AI_KEY.test(rawAi) ? rawAi : "";
  const youtubeKey = YOUTUBE_KEY.test(rawYoutube) ? rawYoutube : "";
  return { aiKey, youtubeKey, provider: inferProvider(aiKey, header(request, "x-aula-ai-provider")) };
}

export function validAiKeyShape(value) { return AI_KEY.test(String(value || "")); }
export function validYoutubeKeyShape(value) { return YOUTUBE_KEY.test(String(value || "")); }

export function runWithUserKeys(context, fn) { return store.run(context, fn); }
export function currentUserKeys() { return store.getStore() || null; }

// Contexto com chave de IA própria (ou null).
export function ownAiContext() {
  const context = store.getStore();
  return context?.aiKey ? context : null;
}

// true quando o pedido não pode usar as chaves do servidor (sem código de acesso válido).
export function serverKeysBlocked() {
  const context = store.getStore();
  return Boolean(context && !context.serverKeysAllowed);
}

export function youtubeKeyForRequest(env = process.env) {
  const context = store.getStore();
  if (context?.youtubeKey) return context.youtubeKey;
  if (context && !context.serverKeysAllowed) return "";
  return envKey("YOUTUBE_API_KEY", env);
}

// Chave do servidor (variável de ambiente). Valor em branco ou só com traços (o que se digita no botão
// "Deploy to Vercel" para pular um campo opcional) conta como ausente.
export function envKey(name, env = process.env) {
  const value = String(env[name] ?? "").trim();
  return /^[-_\s]*$/u.test(value) ? "" : value;
}
