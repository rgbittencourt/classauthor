import test from "node:test";
import assert from "node:assert/strict";
import styleHandler, { buildStylePrompt, learnStyle } from "../src/style-handler.js";
import { normalizeCourseInput } from "../src/aula-schema.js";
import { buildWriterPrompt } from "../src/claude-writer.js";

const payload = {
  pairs: [{ before: "Neste contexto, é importante destacar que o planejamento orienta a prática.", after: "O planejamento orienta a prática." }, { before: "Neste contexto, é importante ressaltar que o aluno precisa de retorno.", after: "O aluno precisa de retorno." }],
  cuts: ["Um parágrafo inteiro sem acrescentar nada ao argumento da aula."], adds: [], habits: [{ text: "neste contexto", n: 2 }], existing: ["Prefira frases curtas."]
};

test("o pedido leva os pares, os cortes, as expressões e as regras atuais", () => {
  const prompt = buildStylePrompt(payload);
  assert.match(prompt, /ANTES: Neste contexto/);
  assert.match(prompt, /DEPOIS: O planejamento/);
  assert.match(prompt, /neste contexto" \(tirou em 2 frases\)/);
  assert.match(prompt, /- Prefira frases curtas\./);
});

test("learnStyle limpa a resposta, tira repetidas e limita a 8", async () => {
  const ask = async () => ({ rules: [{ rule: "Evite 'neste contexto' e 'é importante destacar'.", evidence: "Cortou em 2 frases." }, { rule: "Prefira frases curtas." }, { rule: "Evite 'neste contexto' e 'é importante destacar'." }, { rule: "x" }] });
  const rules = await learnStyle(payload, ask);
  assert.equal(rules.length, 1);
  assert.match(rules[0].text, /neste contexto/);
  assert.equal(rules[0].source, "ia");
  assert.equal(rules[0].on, true);
});

test("poucas correções: avisa sem chamar a IA", async () => {
  let called = false;
  await assert.rejects(() => learnStyle({ pairs: [{ before: "a b c d e", after: "a b c d" }] }, async () => { called = true; return {}; }), { code: "STYLE_FEW" });
  assert.equal(called, false);
});

function res() {
  const out = { status: 0, body: null, headers: {} };
  return Object.assign(out, { setHeader(k, v) { out.headers[k] = v; }, status(c) { out.status = c; return out; }, json(b) { out.body = b; return out; } });
}

test("handler: método, código de acesso e resposta", async () => {
  let r = res(); await styleHandler({ method: "GET", headers: {} }, r); assert.equal(r.status, 405);
  const prev = process.env.AULA_ACCESS_CODE; process.env.AULA_ACCESS_CODE = "x";
  try {
    r = res(); await styleHandler({ method: "POST", headers: {}, body: payload }, r, { ask: async () => ({ rules: [] }) }); assert.equal(r.status, 401);
    r = res(); await styleHandler({ method: "POST", headers: { "x-aula-access-code": "x" }, body: payload }, r, { ask: async () => ({ rules: [{ rule: "Prefira verbos de ação no início das frases." }] }) });
    assert.equal(r.status, 200); assert.equal(r.body.rules.length, 1);
    r = res(); await styleHandler({ method: "POST", headers: { "x-aula-access-code": "x" }, body: { pairs: [] } }, r); assert.equal(r.status, 400); assert.equal(r.body.code, "STYLE_FEW");
  } finally { if (prev === undefined) delete process.env.AULA_ACCESS_CODE; else process.env.AULA_ACCESS_CODE = prev; }
});

test("as regras de estilo chegam ao pedido de redação, só as ligadas", () => {
  const input = normalizeCourseInput({ title: "Curso", weeks: 2, styleGuide: [{ text: "Evite 'neste contexto'.", on: true }, { text: "Regra desligada aqui.", on: false }] });
  assert.deepEqual(input.styleGuide, ["Evite 'neste contexto'."]);
  const prompt = buildWriterPrompt(input, 0, {});
  assert.match(prompt, /ESTILO DO PROFESSOR[\s\S]*Evite 'neste contexto'\./);
  assert.doesNotMatch(prompt, /Regra desligada/);
  assert.doesNotMatch(buildWriterPrompt(normalizeCourseInput({ title: "Curso", weeks: 2 }), 0, {}), /ESTILO DO PROFESSOR/);
  assert.deepEqual(normalizeCourseInput(input).styleGuide, input.styleGuide);
});
