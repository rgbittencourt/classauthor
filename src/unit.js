// Unidade de organização do curso: "semana" (padrão, como sempre foi) ou "aula".
// A estrutura dos dados não muda (cada unidade continua sendo um item da lista, com weekNumber);
// só os NOMES mudam. Com "aula", tudo o que chega ao professor e ao estudante diz "aula":
// pedidos à IA, respostas da API, PDF, DOCX e arquivos do pacote.

import { AsyncLocalStorage } from "node:async_hooks";
import { localizeUnitText } from "../public/unit-text.js";
import { withUsage } from "./ai-usage.js";
import { withKeyContext } from "./access.js";

export { localizeUnitText };

const store = new AsyncLocalStorage();

export function normalizeUnit(value) { return value === "aula" ? "aula" : "semana"; }
export function currentUnit() { return store.getStore()?.unit || "semana"; }
export const localizeUnit = (value) => localizeUnitText(value, currentUnit());

// Número da primeira aula/semana (padrão 1). Um planejamento que continua um curso já começado
// (ex.: aulas 3 e 4 depois de um conjunto 1 e 2) usa 3. Por dentro, tudo continua contando de 1
// (índices, cálculos, pedidos à IA); o número de verdade aparece no que sai para o professor e o estudante:
// a resposta JSON, os nomes de arquivo, o PDF, o DOCX e o ZIP. O pedido que chega faz o caminho de volta.
export function normalizeFirstNumber(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 1 && n <= 99 ? n : 1;
}
export function currentFirstNumber() { return store.getStore()?.first || 1; }
const SHIFT_RE = /\b(Semanas?|SEMANAS?|semanas?|Aulas?|AULAS?)(\s+|&nbsp;)(\d{1,3})((?:(?:\s*,\s*|\s+(?:e|a|ou)\s+)\d{1,3})*)\b(?![.,]\d)/g;
// Soma delta aos números de «Semana N», «Aula N», «Aulas N e M». Na volta (delta negativo), número que ficaria
// menor que 1 não muda: é referência a uma aula de antes deste planejamento.
export function shiftUnitNumbers(value, delta) {
  if (!delta || typeof value !== "string" || !/(semana|aula|weeknumber)/i.test(value)) return value;
  const conv = (d) => { const n = Number(d) + delta; return n >= 1 ? String(n) : d; };
  return value.replace(SHIFT_RE, (all, word, sp, first, rest) => word + sp + conv(first) + rest.replace(/\d{1,3}/g, conv))
    .replace(/("weekNumber"\s*:\s*)(\d+)/g, (all, key, d) => key + conv(d)) // JSON dentro de texto (arquivos do ZIP)
    .replace(/\b(Semana|Aula)(\d{2})(?=-)/g, (all, word, d) => { const n = Number(d) + delta; return n >= 1 ? word + String(n).padStart(2, "0") : all; }); // Semana03-titulo-…
}
// Mesma troca num objeto: textos e o número da aula (meta.weekNumber). Os outros campos numéricos são índices internos.
export function deepShiftUnitNumbers(value, delta, depth = 0, key = "") {
  if (!delta || depth > 40) return value;
  if (typeof value === "string") return /^(?:data:|https?:\/\/|blob:)/i.test(value) || value.length > 400000 ? value : shiftUnitNumbers(value, delta);
  if (Array.isArray(value)) return value.map((item) => deepShiftUnitNumbers(item, delta, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, item] of Object.entries(value)) {
      if (key === "meta" && k === "weekNumber" && Number.isFinite(Number(item)) && Number(item) > 0) { const n = Number(item) + delta; out[k] = n >= 1 ? n : item; continue; }
      out[k] = /^(src|href|url|link|svg|image|dataUri|id)$/i.test(k) ? item : deepShiftUnitNumbers(item, delta, depth + 1, k);
    }
    return out;
  }
  return value;
}
// Para o que sai em arquivo (PDF, DOCX, ZIP): unidade e número de verdade.
export const localizeForOutput = (value) => shiftUnitNumbers(localizeUnit(value), currentFirstNumber() - 1);

// Troca em todos os textos de um objeto (não toca em chaves, URLs nem dados binários).
export function deepLocalize(value, unit = currentUnit(), depth = 0) {
  if (unit !== "aula" || depth > 40) return value;
  if (typeof value === "string") return /^(?:data:|https?:\/\/|blob:)/i.test(value) || value.length > 400000 ? value : localizeUnitText(value, unit);
  if (Array.isArray(value)) return value.map((item) => deepLocalize(item, unit, depth + 1));
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = /^(src|href|url|link|svg|image|dataUri)$/i.test(key) ? item : deepLocalize(item, unit, depth + 1);
    return out;
  }
  return value;
}

// Envolve um handler da API: com unidade "aula", o pedido é traduzido na entrada, o contexto fica
// disponível para os geradores (IA, PDF, DOCX, ZIP) e a resposta JSON é traduzida na saída.
export function withUnit(rawHandler) {
  const handler = withKeyContext(withUsage(rawHandler));
  return async function unitHandler(request, response) {
    const unit = normalizeUnit(request?.body?.input?.unit || request?.body?.unit);
    const first = normalizeFirstNumber(request?.body?.input?.firstNumber || request?.body?.firstNumber);
    const off = first - 1;
    if (unit !== "aula" && !off) return store.run({ unit, first }, () => handler(request, response));
    if (request.body && typeof request.body === "object") request.body = deepShiftUnitNumbers(deepLocalize(request.body, unit), -off);
    const json = response.json?.bind(response);
    if (json) response.json = (payload) => json(deepShiftUnitNumbers(deepLocalize(payload, unit), off));
    const setHeader = response.setHeader?.bind(response);
    if (setHeader) response.setHeader = (name, value) => setHeader(name, /^content-disposition$/i.test(name) ? shiftUnitNumbers(localizeUnitText(String(value), unit), off) : value);
    return store.run({ unit, first }, () => handler(request, response));
  };
}
