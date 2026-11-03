// Mede o que cada pedido à API consumiu de IA (chamadas e tokens) para mostrar o custo à pessoa.
// Cada requisição HTTP abre seu próprio contador (AsyncLocalStorage); ai-client.js registra ali o uso
// informado pelo provedor e a resposta JSON da rota devolve o total no campo `usage`.

import { AsyncLocalStorage } from "node:async_hooks";
import { emptyUsage, addUsage, USD_BRL_DEFAULT, priceFor } from "./ai-cost.js";

const store = new AsyncLocalStorage();

// Normaliza o uso das duas APIs: input = tokens de entrada não vindos de cache.
export function normalizeProviderUsage(usage) {
  if (!usage || typeof usage !== "object") return null;
  const n = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
  if (usage.input_tokens !== undefined || usage.output_tokens !== undefined) {
    return { calls: 1, input: n(usage.input_tokens), output: n(usage.output_tokens), cacheRead: n(usage.cache_read_input_tokens), cacheWrite: n(usage.cache_creation_input_tokens) };
  }
  if (usage.prompt_tokens !== undefined || usage.completion_tokens !== undefined) {
    const cached = n(usage.prompt_tokens_details?.cached_tokens);
    return { calls: 1, input: Math.max(0, n(usage.prompt_tokens) - cached), output: n(usage.completion_tokens), cacheRead: cached, cacheWrite: 0 };
  }
  return null;
}

// Registra uma resposta do provedor (chamado por ai-client.js a cada tentativa que o provedor cobra).
export function recordAIUsage(payload, model) {
  const ctx = store.getStore();
  if (!ctx) return;
  const usage = normalizeProviderUsage(payload?.usage);
  if (!usage) return;
  ctx.usage = addUsage(ctx.usage, usage);
  if (model) ctx.model = model;
}

// Executa um handler com contador próprio; a resposta JSON ganha `usage` quando houve chamadas de IA.
export function withUsage(handler) {
  return function usageHandler(request, response) {
    const ctx = { usage: emptyUsage(), model: "" };
    const json = response?.json?.bind(response);
    if (json) {
      response.json = (payload) => {
        if (payload && typeof payload === "object" && !Array.isArray(payload) && !payload.usage && ctx.usage.calls > 0) payload = { ...payload, usage: { ...ctx.usage, model: ctx.model } };
        return json(payload);
      };
    }
    return store.run(ctx, () => handler(request, response));
  };
}

// ── Cotação do dólar ──
// Ordem: AI_USD_BRL (você fixou) > cotação automática da internet > valor de referência embutido.
// A cotação automática vem de uma API pública gratuita (AwesomeAPI; se falhar, open.er-api.com),
// fica em memória por 6 horas e, se a internet falhar, o servidor usa o valor de referência.
const RATE_TTL_MS = 6 * 60 * 60 * 1000;
const RATE_SOURCES = [
  { name: "AwesomeAPI", url: "https://economia.awesomeapi.com.br/json/last/USD-BRL", read: (data) => Number(data?.USDBRL?.bid) },
  { name: "open.er-api.com", url: "https://open.er-api.com/v6/latest/USD", read: (data) => Number(data?.rates?.BRL) }
];
let rateCache = null;

export function resetUsdBrlCache() { rateCache = null; }

export async function liveUsdBrl(fetchImpl = globalThis.fetch) {
  if (rateCache && Date.now() - rateCache.at < RATE_TTL_MS) return rateCache;
  for (const source of RATE_SOURCES) {
    try {
      const response = await fetchImpl(source.url, { signal: AbortSignal.timeout(2500), headers: { Accept: "application/json" } });
      if (!response.ok) continue;
      const value = source.read(await response.json());
      // Cotação absurda (erro da fonte) é descartada.
      if (Number.isFinite(value) && value > 2 && value < 15) { rateCache = { value, source: source.name, at: Date.now() }; return rateCache; }
    } catch { /* tenta a próxima fonte */ }
  }
  return null;
}

// Preço e cotação em uso (ambiente > tabela), para o navegador converter em reais.
export async function aiPricingStatus(model, fetchImpl) {
  const env = process.env;
  const price = priceFor(model, { input: env.AI_PRICE_INPUT_USD, output: env.AI_PRICE_OUTPUT_USD });
  const fixed = Number(env.AI_USD_BRL) > 0 ? Number(env.AI_USD_BRL) : 0;
  if (fixed) return { model, price, usdBrl: fixed, usdBrlSource: "fixada no servidor (AI_USD_BRL)" };
  const live = env.AI_USD_BRL_AUTO === "false" ? null : await liveUsdBrl(fetchImpl);
  if (live) {
    const when = new Date(live.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    return { model, price, usdBrl: live.value, usdBrlSource: `cotação automática (${live.source}, ${when})`, usdBrlAuto: true };
  }
  return { model, price, usdBrl: USD_BRL_DEFAULT, usdBrlSource: "valor de referência de 03/11/2026; sem acesso à cotação da internet" };
}
