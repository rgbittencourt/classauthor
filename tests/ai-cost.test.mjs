import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PRICE_TABLE, DEFAULT_PER_WEEK, addUsage, costOf, emptyUsage, estimateGeneration, formatBRL, learnedPerWeek, priceFor, subtractUsage, totalTokens } from "../src/ai-cost.js";
import { aiPricingStatus, liveUsdBrl, normalizeProviderUsage, recordAIUsage, resetUsdBrlCache } from "../src/ai-usage.js";
import { withUnit } from "../src/unit.js";

test("public/ai-cost.js é cópia idêntica de src/ai-cost.js", () => {
  assert.equal(fs.readFileSync("public/ai-cost.js", "utf8"), fs.readFileSync("src/ai-cost.js", "utf8"));
});

test("preço do Claude Sonnet 5.5 e custo em reais", () => {
  const price = priceFor("claude-sonnet-5-5");
  assert.equal(price.input, 2);
  assert.equal(price.output, 10);
  const cost = costOf({ input: 1_000_000, output: 1_000_000 }, price, 5);
  assert.equal(cost.usd, 12);
  assert.equal(cost.brl, 60);
  assert.equal(priceFor("modelo-desconhecido"), null);
  assert.equal(costOf({ input: 10 }, null), null);
  assert.ok(PRICE_TABLE.length >= 3);
});

test("variáveis de ambiente valem para qualquer modelo", async () => {
  const price = priceFor("modelo-x", { input: "1", output: "4" });
  assert.equal(price.input, 1);
  assert.equal(price.output, 4);
  process.env.AI_PRICE_INPUT_USD = "3"; process.env.AI_PRICE_OUTPUT_USD = "15"; process.env.AI_USD_BRL = "5.5";
  const status = await aiPricingStatus("qualquer");
  delete process.env.AI_PRICE_INPUT_USD; delete process.env.AI_PRICE_OUTPUT_USD; delete process.env.AI_USD_BRL;
  assert.equal(status.price.output, 15);
  assert.equal(status.usdBrl, 5.5);
});

test("formatBRL usa reais em formato brasileiro", () => {
  assert.match(formatBRL(7.4), /R\$\s?7,40/);
  assert.match(formatBRL(1234.5), /R\$\s?1\.234,50/);
  assert.match(formatBRL(0.001), /menos de R\$/);
});

test("soma e subtração de consumo", () => {
  const a = addUsage(emptyUsage(), { calls: 2, input: 100, output: 50 });
  const b = addUsage(a, { calls: 1, input: 10, output: 5, cacheRead: 7 });
  assert.deepEqual(subtractUsage(b, a), { calls: 1, input: 10, output: 5, cacheRead: 7, cacheWrite: 0 });
  assert.equal(totalTokens(b), 172);
});

test("estimativa: sem histórico usa o valor típico com faixa larga", () => {
  const price = priceFor("claude-sonnet-5-5");
  const est = estimateGeneration({ weeks: 6, allWeeks: 6, model: "claude-sonnet-5-5", price, usdBrl: 5 });
  assert.equal(est.learned, false);
  assert.ok(est.run.brl.low < est.run.brl.mid && est.run.brl.mid < est.run.brl.high);
  const perWeek = (DEFAULT_PER_WEEK.input * 2 + DEFAULT_PER_WEEK.output * 10) / 1e6 * 5;
  assert.ok(Math.abs(est.run.brl.mid - perWeek * 6) < 1e-6);
  assert.equal(est.run.weeks, 6);
});

test("estimativa aprende com as gerações anteriores do mesmo modelo", () => {
  const price = priceFor("claude-sonnet-5-5");
  const history = [
    { model: "claude-sonnet-5-5", weeks: 2, usage: { calls: 20, input: 100000, output: 40000, cacheRead: 0, cacheWrite: 0 } },
    { model: "outro", weeks: 5, usage: { calls: 999, input: 1, output: 1 } }
  ];
  const learned = learnedPerWeek(history, "claude-sonnet-5-5");
  assert.equal(learned.calls, 10);
  assert.equal(learned.input, 50000);
  const est = estimateGeneration({ weeks: 3, allWeeks: 3, model: "claude-sonnet-5-5", price, usdBrl: 5, history });
  assert.equal(est.learned, true);
  assert.equal(est.samples, 1);
  assert.ok(est.run.calls.low <= 30 && est.run.calls.high >= 30);
  assert.equal(learnedPerWeek([], "x"), null);
});

test("sem preço conhecido a estimativa mostra só chamadas e tokens", () => {
  const est = estimateGeneration({ weeks: 2, model: "x", price: null });
  assert.equal(est.priceKnown, false);
  assert.equal(est.run.brl, null);
  assert.ok(est.run.tokens > 0);
});

test("uso das duas APIs é normalizado", () => {
  assert.deepEqual(normalizeProviderUsage({ input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 3, cache_creation_input_tokens: 2 }), { calls: 1, input: 10, output: 5, cacheRead: 3, cacheWrite: 2 });
  assert.deepEqual(normalizeProviderUsage({ prompt_tokens: 100, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 40 } }), { calls: 1, input: 60, output: 20, cacheRead: 40, cacheWrite: 0 });
  assert.equal(normalizeProviderUsage(null), null);
  assert.equal(normalizeProviderUsage({}), null);
});

test("a resposta da rota ganha `usage` com o total das chamadas, nas duas unidades", async () => {
  for (const unit of ["semana", "aula"]) {
    const handler = withUnit(async (_request, response) => {
      recordAIUsage({ usage: { input_tokens: 1000, output_tokens: 500 } }, "claude-sonnet-5-5");
      await new Promise((resolve) => setTimeout(resolve, 2));
      recordAIUsage({ usage: { prompt_tokens: 300, completion_tokens: 50 } });
      response.json({ ok: true });
    });
    let body;
    await handler({ body: { unit } }, { json: (payload) => { body = payload; }, setHeader() {} });
    assert.equal(body.usage.calls, 2);
    assert.equal(body.usage.input, 1300);
    assert.equal(body.usage.output, 550);
    assert.equal(body.usage.model, "claude-sonnet-5-5");
  }
});

test("rota sem chamada de IA não recebe `usage`; contadores de pedidos simultâneos não se misturam", async () => {
  let plain;
  await withUnit(async (_request, response) => { response.json({ ok: true }); })({ body: {} }, { json: (payload) => { plain = payload; }, setHeader() {} });
  assert.equal("usage" in plain, false);
  const results = [];
  await Promise.all([1, 2, 3].map((n) => withUnit(async (_request, response) => {
    await new Promise((resolve) => setTimeout(resolve, 5 - n));
    for (let i = 0; i < n; i += 1) recordAIUsage({ usage: { input_tokens: 10, output_tokens: 1 } });
    response.json({ n });
  })({ body: {} }, { json: (payload) => results.push(payload), setHeader() {} })));
  for (const row of results) assert.equal(row.usage.calls, row.n);
});

const okJson = (data) => async () => ({ ok: true, json: async () => data });

test("cotação automática do dólar, com cache, fonte reserva e descarte de valor absurdo", async () => {
  resetUsdBrlCache();
  let calls = 0;
  const first = await liveUsdBrl(async (url) => { calls += 1; return /awesomeapi/.test(url) ? { ok: true, json: async () => ({ USDBRL: { bid: "5.31" } }) } : { ok: false }; });
  assert.equal(first.value, 5.31);
  assert.equal(first.source, "AwesomeAPI");
  await liveUsdBrl(async () => { calls += 1; throw new Error("não deveria chamar: tem cache"); });
  assert.equal(calls, 1);
  resetUsdBrlCache();
  const backup = await liveUsdBrl(async (url) => (/awesomeapi/.test(url) ? { ok: false } : { ok: true, json: async () => ({ rates: { BRL: 5.2 } }) }));
  assert.equal(backup.value, 5.2);
  resetUsdBrlCache();
  assert.equal(await liveUsdBrl(okJson({ USDBRL: { bid: "0.5" } })), null);
  assert.equal(await liveUsdBrl(async () => { throw new Error("sem internet"); }), null);
});

test("preço: AI_USD_BRL fixo vence a automática, que vence a de referência", async () => {
  resetUsdBrlCache();
  const net = async () => ({ ok: true, json: async () => ({ USDBRL: { bid: "5.40" } }) });
  const auto = await aiPricingStatus("claude-sonnet-5-5", net);
  assert.equal(auto.usdBrl, 5.4);
  assert.equal(auto.usdBrlAuto, true);
  process.env.AI_USD_BRL = "6";
  const fixed = await aiPricingStatus("claude-sonnet-5-5", net);
  delete process.env.AI_USD_BRL;
  assert.equal(fixed.usdBrl, 6);
  resetUsdBrlCache();
  const offline = await aiPricingStatus("claude-sonnet-5-5", async () => { throw new Error("off"); });
  assert.equal(offline.usdBrl, 5.49);
  assert.match(offline.usdBrlSource, /referência/);
});
