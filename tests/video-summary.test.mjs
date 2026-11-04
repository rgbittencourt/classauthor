import test from "node:test";
import assert from "node:assert/strict";
import videoSummaryHandler, { buildTimedLines, splitParts, normalizeSummary, summarizeVideo, formatMark } from "../src/video-summary.js";

const mock = (method, headers = {}, body = {}) => {
  const out = { headers: {}, status: 0, body: null };
  const response = { setHeader: (k, v) => { out.headers[k] = v; }, status(code) { out.status = code; return this; }, json(payload) { out.body = payload; return this; }, end() { return this; } };
  return { out, request: { method, headers, body }, response };
};
// 80 falas de 5 s, com texto suficiente para passar do mínimo de 400 caracteres
const cues = Array.from({ length: 80 }, (_, i) => [i * 5, i * 5 + 4.5, `fala número ${i} sobre o assunto da aula de hoje`]);

test("formatMark escreve m:ss e h:mm:ss", () => {
  assert.equal(formatMark(65), "1:05");
  assert.equal(formatMark(3725), "1:02:05");
  assert.equal(formatMark(-3), "0:00");
});

test("buildTimedLines junta as falas em linhas de ~25 s com o tempo no começo", () => {
  const { lines, duration } = buildTimedLines(cues);
  assert.equal(lines[0].startsWith("[0:00] fala número 0"), true);
  assert.equal(lines[1].startsWith("[0:25] "), true);
  assert.equal(lines.length, 16);
  assert.ok(duration > 394);
  assert.deepEqual(buildTimedLines([["x", 1, "a"], [3, 4, ""], null]).lines, []);
});

test("splitParts divide pelo tamanho sem perder linhas", () => {
  const lines = Array.from({ length: 10 }, (_, i) => `[${i}:00] ${"a".repeat(100)}`);
  const parts = splitParts(lines, 350);
  assert.ok(parts.length > 1);
  assert.equal(parts.flat().length, 10);
});

test("normalizeSummary confere tempos, ordena e descarta o que não presta", () => {
  const items = normalizeSummary({ sections: [
    { title: "  Seleção  ", points: [{ start: 120, text: "Segundo" }, { start: 30, text: "Primeiro" }, { start: 99999, text: "Tempo absurdo" }, { text: "" }] },
    { title: "", points: [] },
    { title: "Sem tempo", points: [{ text: "Solto" }] }
  ] }, { duration: 400 });
  assert.deepEqual(items.map((i) => [i.k, i.x, i.s]), [
    ["h1", "Seleção", 30], ["p", "Primeiro", 30], ["p", "Segundo", 120], ["p", "Tempo absurdo", null],
    ["h1", "Sem tempo", null], ["p", "Solto", null]
  ]);
  assert.deepEqual(normalizeSummary(null), []);
});

test("summarizeVideo chama a IA por parte e junta o resultado", async () => {
  const calls = [];
  const ask = async (messages) => { calls.push(messages[1].content); return { sections: [{ title: "Parte " + calls.length, points: [{ start: 10, text: "Ponto " + calls.length }] }] }; };
  const one = await summarizeVideo({ cues }, ask);
  assert.equal(one.parts, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /TRANSCRIÇÃO DO TRECHO:\n\[0:00\]/);
  assert.deepEqual(one.items.map((i) => i.x), ["Parte 1", "Ponto 1"]);
  await assert.rejects(() => summarizeVideo({ cues: cues.slice(0, 3) }, ask), { code: "SUMMARY_SHORT" });
  await assert.rejects(() => summarizeVideo({ cues }, async () => ({ sections: [] })), { code: "SUMMARY_EMPTY" });
});

test("summarizeVideo divide vídeo longo em partes e recusa o longo demais", async () => {
  const long = Array.from({ length: 1500 }, (_, i) => [i * 3, i * 3 + 2.5, "uma frase razoavelmente comprida para encher as partes do resumo " + i]);
  const seen = [];
  const ask = async (messages) => { seen.push(messages[1].content.match(/Trecho (\d+) de (\d+)/)?.[0]); return { sections: [{ title: "T", points: [{ start: 5, text: "p" }] }] }; };
  const result = await summarizeVideo({ cues: long }, ask);
  assert.ok(result.parts >= 2 && result.parts <= 4);
  assert.equal(seen.length, result.parts);
  const huge = Array.from({ length: 6000 }, (_, i) => [i * 3, i * 3 + 2.5, "uma frase razoavelmente comprida para encher as partes do resumo " + i + " e mais um pouco de texto aqui"]);
  await assert.rejects(() => summarizeVideo({ cues: huge }, ask), { code: "SUMMARY_TOO_LONG" });
});

test("handler: CORS, código de acesso e resposta", async () => {
  const prev = process.env.AULA_ACCESS_CODE;
  process.env.AULA_ACCESS_CODE = "segredo";
  try {
    const ask = async () => ({ sections: [{ title: "Tema", points: [{ start: 12, text: "Ponto" }] }] });
    const origin = "https://rgbittencourt.github.io";
    let m = mock("OPTIONS", { origin }, {});
    await videoSummaryHandler(m.request, m.response);
    assert.equal(m.out.status, 204);
    m = mock("POST", { origin }, { cues });
    await videoSummaryHandler(m.request, m.response, { ask });
    assert.equal(m.out.status, 401);
    m = mock("POST", { origin, "x-aula-access-code": "segredo" }, { cues });
    await videoSummaryHandler(m.request, m.response, { ask });
    assert.equal(m.out.status, 200);
    assert.equal(m.out.body.items[1].s, 12);
    m = mock("POST", { origin: "https://outro.site", "x-aula-access-code": "segredo" }, { cues });
    await videoSummaryHandler(m.request, m.response, { ask });
    assert.equal(m.out.status, 403);
    m = mock("POST", { origin, "x-aula-access-code": "segredo" }, { cues: [] });
    await videoSummaryHandler(m.request, m.response, { ask });
    assert.equal(m.out.status, 400);
    assert.equal(m.out.body.code, "SUMMARY_SHORT");
  } finally { if (prev === undefined) delete process.env.AULA_ACCESS_CODE; else process.env.AULA_ACCESS_CODE = prev; }
});
