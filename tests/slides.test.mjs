import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSlide, normalizeFrame, slidesForSection, slidesFrame, slideAnswer } from "../src/slides.js";
import slidesHandler from "../src/slides-handler.js";

const fakeResponse = () => {
  const res = { statusCode: 0, headers: {}, body: null };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  return res;
};

test("normalizeSlide aceita só tipos do catálogo e corta textos longos", () => {
  assert.equal(normalizeSlide({ type: "video", title: "x" }), null);
  const s = normalizeSlide({ type: "cards", title: "T".repeat(200), items: [{ title: "a", text: "b" }, { title: "c", text: "d" }, { title: "e" }, { title: "f" }, { title: "g" }], notes: "<b>fala</b>" });
  assert.equal(s.items.length, 4);
  assert.ok(s.title.length <= 70);
  assert.equal(s.notes, "fala");
  assert.equal(normalizeSlide({ type: "cards", items: [{ title: "só um" }] }), null);
});

test("imagem só entra com um id da lista enviada", () => {
  assert.equal(normalizeSlide({ type: "image", imageId: "img9" }, ["img1"]), null);
  assert.equal(normalizeSlide({ type: "image", imageId: "img1", title: "Figura" }, ["img1"]).imageId, "img1");
});

test("tabela completa as células que faltam", () => {
  const t = normalizeSlide({ type: "table", title: "Bandas", headers: ["Banda", "λ"], rows: [["L"], ["C", "5 cm"]] });
  assert.deepEqual(t.rows, [["L", ""], ["C", "5 cm"]]);
});

test("slidesForSection devolve slides normalizados e passa o pedido para a IA", async () => {
  let seen = null;
  const ask = async (messages) => { seen = messages; return { slides: [{ type: "reflect", question: "Por quê?", notes: "Resposta detalhada." }, { type: "nada" }] }; };
  const r = await slidesForSection({ lessonTitle: "Radar", sectionTitle: "Eco", text: "O radar mede o tempo de ida e volta do pulso de micro-ondas e calcula a distância.", count: 6, avoid: ["Eco e distância"], part: "parte 2 de 3" }, { ask });
  assert.equal(r.slides.length, 1);
  assert.equal(r.slides[0].type, "reflect");
  assert.match(seen[1].content, /EXATAMENTE 6 slide/);
  assert.match(seen[1].content, /não repita[\s\S]*Eco e distância/);
  assert.match(seen[1].content, /parte 2 de 3/);
  assert.match(seen[0].content, /RESPOSTA:/);
});

test("slidesForSection recusa seção sem texto", async () => {
  await assert.rejects(() => slidesForSection({ text: "curto" }, { ask: async () => ({}) }), /texto suficiente/);
});

test("slidesFrame normaliza pergunta, objetivos e síntese", async () => {
  const ask = async () => ({ question: "Como enxergar sem luz?", objectives: [{ verb: "Explicar", text: "o eco" }, { verb: "", text: "x" }], synthesis: [{ title: "Eco → distância", text: "R = c·t/2" }] });
  const f = await slidesFrame({ lessonTitle: "Radar", sectionTitles: ["Eco"], text: "texto" }, { ask });
  assert.equal(f.question, "Como enxergar sem luz?");
  assert.equal(f.objectives.length, 1);
  assert.equal(f.synthesis.length, 1);
  assert.deepEqual(normalizeFrame(null), { question: "", questionAnswer: "", objectives: [], synthesis: [], closing: { title: "", question: "", hints: [], answer: "" } });
});

test("a moldura traz a pergunta que fica, com caminhos e orientação de resposta", () => {
  const f = normalizeFrame({ closing: { title: "σ⁰ como medida indireta", question: "Como separar vento de óleo num mesmo σ⁰?", hints: ["Outros ângulos", "", "Outras fontes"], answer: "Cada causa deixa uma assinatura diferente." } });
  assert.equal(f.closing.question, "Como separar vento de óleo num mesmo σ⁰?");
  assert.deepEqual(f.closing.hints, ["Outros ângulos", "Outras fontes"]);
  assert.match(f.closing.answer, /assinatura/);
});

test("o handler responde ao pré-voo do ClassAtelier e recusa origem estranha", async () => {
  const ok = fakeResponse();
  await slidesHandler({ method: "OPTIONS", headers: { origin: "https://rgbittencourt.github.io" } }, ok);
  assert.equal(ok.statusCode, 204);
  assert.equal(ok.headers["Access-Control-Allow-Origin"], "https://rgbittencourt.github.io");
  const bad = fakeResponse();
  await slidesHandler({ method: "POST", headers: { origin: "https://exemplo.com" }, body: {} }, bad);
  assert.equal(bad.statusCode, 403);
});

test("o handler gera os slides de uma seção", async () => {
  const prev = process.env.AULA_ACCESS_CODE; delete process.env.AULA_ACCESS_CODE;
  const res = fakeResponse();
  const ask = async () => ({ slides: [{ type: "statement", text: "Brilho é potência devolvida." }] });
  await slidesHandler({ method: "POST", headers: { origin: "https://rgbittencourt.github.io" }, body: { action: "slides", mode: "section", text: "Para um radar, brilho é potência devolvida: quanta energia volta à antena." } }, res, { ask });
  if (prev !== undefined) process.env.AULA_ACCESS_CODE = prev;
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.slides[0].type, "statement");
});

test("slidesForSection corta o excesso na quantidade pedida", async () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ type: "statement", text: "Ideia " + i }));
  const r = await slidesForSection({ text: "Texto suficiente para gerar slides sobre o radar e o eco do mar.", count: 4 }, { ask: async () => ({ slides: many }) });
  assert.equal(r.slides.length, 4);
});

test("slideAnswer devolve a resposta detalhada e o frame traz a resposta da pergunta central", async () => {
  const a = await slideAnswer({ question: "Qual a profundidade?", context: "eco 0,04 s" }, { ask: async () => ({ answer: "Com a velocidade do som na água, cerca de 1.500 m/s, d = v·t/2 = 30 m." }) });
  assert.match(a.answer, /30 m/);
  await assert.rejects(() => slideAnswer({ question: "" }, { ask: async () => ({}) }), /pergunta/);
  const f = normalizeFrame({ question: "Por quê?", questionAnswer: "Porque sim, e eis o raciocínio." });
  assert.match(f.questionAnswer, /raciocínio/);
});
