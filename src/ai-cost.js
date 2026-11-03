// Custo da IA: tabela de preços, conversão para reais e estimativa antes de gerar.
//
// Código puro (sem Node): public/ai-cost.js é cópia idêntica deste arquivo e roda no navegador.
// Os valores em dólar são de REFERÊNCIA (páginas públicas de preço, conferidas em 03/11/2026) e
// podem ser trocados por variáveis de ambiente (AI_PRICE_INPUT_USD, AI_PRICE_OUTPUT_USD, AI_USD_BRL).
// Tudo o que aparece para a pessoa é mostrado em reais (R$) e sempre como valor APROXIMADO.

export const USD_BRL_DEFAULT = 4.97; // referência de 23/10/2026; ajuste com AI_USD_BRL

// Dólares por MILHÃO de tokens. Ordem importa: a primeira regra que combinar vale.
export const PRICE_TABLE = Object.freeze([
  { match: /claude-sonnet-5/i, input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  { match: /gpt-4o-mini/i, input: 0.15, output: 0.6, cacheRead: 0.075, cacheWrite: 0.15 },
  { match: /gpt-4o/i, input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 2.5 }
]);

// Consumo típico de UMA semana inteira (plano, redação, avaliação, mediação, recursos, ilustração).
// É um ponto de partida: depois de gerar, o aplicativo aprende o consumo real de cada pessoa.
export const DEFAULT_PER_WEEK = Object.freeze({ calls: 9, input: 48000, output: 20000, cacheRead: 0, cacheWrite: 0 });

const num = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0);

export function emptyUsage() { return { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }; }

export function addUsage(total, extra) {
  const base = total || emptyUsage();
  const add = extra || {};
  return { calls: base.calls + num(add.calls), input: base.input + num(add.input), output: base.output + num(add.output), cacheRead: base.cacheRead + num(add.cacheRead), cacheWrite: base.cacheWrite + num(add.cacheWrite) };
}

export function subtractUsage(total, base) {
  const a = total || emptyUsage();
  const b = base || emptyUsage();
  return { calls: Math.max(0, a.calls - b.calls), input: Math.max(0, a.input - b.input), output: Math.max(0, a.output - b.output), cacheRead: Math.max(0, a.cacheRead - b.cacheRead), cacheWrite: Math.max(0, a.cacheWrite - b.cacheWrite) };
}

export const totalTokens = (usage) => num(usage?.input) + num(usage?.output) + num(usage?.cacheRead) + num(usage?.cacheWrite);

// Preço do modelo em US$/milhão de tokens, ou null se o modelo não é conhecido.
// overrides: { input, output } (em US$/milhão) vindos do ambiente, valem para qualquer modelo.
export function priceFor(model, overrides = {}) {
  const input = num(overrides.input), output = num(overrides.output);
  const found = PRICE_TABLE.find((row) => row.match.test(String(model || "")));
  if (input && output) return { input, output, cacheRead: num(overrides.cacheRead) || input * 0.1, cacheWrite: num(overrides.cacheWrite) || input * 1.25, source: "ambiente" };
  if (!found) return null;
  return { input: found.input, output: found.output, cacheRead: found.cacheRead, cacheWrite: found.cacheWrite, source: "tabela" };
}

// Custo de um consumo: { usd, brl } (null se não há preço).
export function costOf(usage, price, usdBrl = USD_BRL_DEFAULT) {
  if (!price) return null;
  const usd = (num(usage?.input) * price.input + num(usage?.output) * price.output + num(usage?.cacheRead) * price.cacheRead + num(usage?.cacheWrite) * price.cacheWrite) / 1e6;
  return { usd, brl: usd * (num(usdBrl) || USD_BRL_DEFAULT) };
}

export function formatBRL(value) {
  const v = Number(value) || 0;
  if (v > 0 && v < 0.01) return "menos de R$ 0,01";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const formatInt = (value) => Math.round(Number(value) || 0).toLocaleString("pt-BR");

// Média por semana do que a própria pessoa já gerou com este modelo (history: [{model, weeks, usage}]).
// Devolve null se não há histórico útil.
export function learnedPerWeek(history, model) {
  const rows = (Array.isArray(history) ? history : []).filter((row) => row && row.model === model && num(row.weeks) > 0 && row.usage && num(row.usage.calls) > 0).slice(-6);
  if (!rows.length) return null;
  const sum = rows.reduce((acc, row) => addUsage(acc, row.usage), emptyUsage());
  const weeks = rows.reduce((acc, row) => acc + num(row.weeks), 0);
  return { calls: sum.calls / weeks, input: sum.input / weeks, output: sum.output / weeks, cacheRead: sum.cacheRead / weeks, cacheWrite: sum.cacheWrite / weeks, samples: rows.length, weeks };
}

// Estimativa de uma geração. weeks = semanas que serão geradas nesta rodada; allWeeks = a disciplina inteira.
// Sem histórico a faixa é larga (de 70% a 160% do valor típico); com histórico, mais estreita.
export function estimateGeneration({ weeks, allWeeks, model, price, usdBrl = USD_BRL_DEFAULT, history = [] } = {}) {
  const learned = learnedPerWeek(history, model);
  const per = learned || DEFAULT_PER_WEEK;
  const [low, high] = learned ? [0.85, 1.25] : [0.7, 1.6];
  const scale = (count, factor = 1) => ({ calls: per.calls * count * factor, input: per.input * count * factor, output: per.output * count * factor, cacheRead: per.cacheRead * count * factor, cacheWrite: per.cacheWrite * count * factor });
  const make = (count) => {
    const mid = scale(count), lo = scale(count, low), hi = scale(count, high);
    const cost = (usage) => costOf(usage, price, usdBrl);
    return { weeks: count, usage: mid, calls: { low: Math.max(1, Math.round(lo.calls)), high: Math.max(1, Math.round(hi.calls)) }, tokens: totalTokens(mid), brl: price ? { low: cost(lo).brl, mid: cost(mid).brl, high: cost(hi).brl } : null };
  };
  return { learned: Boolean(learned), samples: learned ? learned.samples : 0, run: make(Math.max(0, Number(weeks) || 0)), whole: make(Math.max(0, Number(allWeeks) || Number(weeks) || 0)), priceKnown: Boolean(price) };
}
