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

// Preço e cotação em uso (ambiente > tabela), para o navegador converter em reais.
export function aiPricingStatus(model) {
  const env = process.env;
  const price = priceFor(model, { input: env.AI_PRICE_INPUT_USD, output: env.AI_PRICE_OUTPUT_USD });
  const usdBrl = Number(env.AI_USD_BRL) > 0 ? Number(env.AI_USD_BRL) : USD_BRL_DEFAULT;
  return { model, price, usdBrl, usdBrlSource: Number(env.AI_USD_BRL) > 0 ? "ambiente" : "referência de 23/10/2026" };
}
