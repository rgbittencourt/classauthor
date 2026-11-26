import test from "node:test";
import assert from "node:assert/strict";
import { shiftUnitNumbers, deepShiftUnitNumbers, normalizeFirstNumber, withUnit, localizeForOutput, currentFirstNumber } from "../src/unit.js";

test("normalizeFirstNumber: padrão 1, só inteiros de 2 a 99 mudam", () => {
  assert.equal(normalizeFirstNumber(undefined), 1);
  assert.equal(normalizeFirstNumber("3"), 3);
  assert.equal(normalizeFirstNumber(0), 1);
  assert.equal(normalizeFirstNumber(-2), 1);
  assert.equal(normalizeFirstNumber(150), 1);
  assert.equal(normalizeFirstNumber("abc"), 1);
});

test("shiftUnitNumbers: «Aula N», «AULA N», «Aulas N e M», «Semana N», nomes de arquivo e weekNumber em JSON", () => {
  assert.equal(shiftUnitNumbers("Como vimos na Aula 1, e na Aula 2 veremos.", 2), "Como vimos na Aula 3, e na Aula 4 veremos.");
  assert.equal(shiftUnitNumbers("AULA 1 · Fundamentos", 2), "AULA 3 · Fundamentos");
  assert.equal(shiftUnitNumbers("Revise as Aulas 1 e 2.", 2), "Revise as Aulas 3 e 4.");
  assert.equal(shiftUnitNumbers("Semana 1 · 03/03", 4), "Semana 5 · 03/03");
  assert.equal(shiftUnitNumbers("classatelier/Semana01-sar-ClassAtelier.json", 2), "classatelier/Semana03-sar-ClassAtelier.json");
  assert.equal(shiftUnitNumbers('{ "weekNumber": 1, "x": 2 }', 2), '{ "weekNumber": 3, "x": 2 }');
  // não mexe no que não é número de aula
  assert.equal(shiftUnitNumbers("nesta aula 2 exemplos; Aula 1.5; Seção 1", 2), "nesta aula 2 exemplos; Aula 1.5; Seção 1");
});

test("shiftUnitNumbers na volta: número que ficaria menor que 1 continua igual", () => {
  assert.equal(shiftUnitNumbers("na Aula 3 e na Aula 1", -2), "na Aula 1 e na Aula 1");
  assert.equal(shiftUnitNumbers("Aula 4", -2), "Aula 2");
});

test("deepShiftUnitNumbers: textos e meta.weekNumber; outros weekNumber, ids e links ficam", () => {
  const lesson = { meta: { weekNumber: 1, weekLabel: "Aula 1", title: "SAR" }, lessonPlan: { weekNumber: 1, theme: "Aula 1: SAR" }, blocks: [{ id: "Aula 1", props: { text: "Na Aula 2…", href: "https://x/Aula 1" } }], issues: [{ weekNumber: 2, text: "Semana 2: falta objetivo" }] };
  const out = deepShiftUnitNumbers(lesson, 2);
  assert.equal(out.meta.weekNumber, 3);
  assert.equal(out.meta.weekLabel, "Aula 3");
  assert.equal(out.lessonPlan.weekNumber, 1, "lessonPlan.weekNumber é índice interno");
  assert.equal(out.lessonPlan.theme, "Aula 3: SAR");
  assert.equal(out.blocks[0].id, "Aula 1");
  assert.equal(out.blocks[0].props.href, "https://x/Aula 1");
  assert.equal(out.blocks[0].props.text, "Na Aula 4…");
  assert.equal(out.issues[0].weekNumber, 2);
  assert.equal(out.issues[0].text, "Semana 4: falta objetivo");
  // ida e volta devolvem o original
  assert.deepEqual(deepShiftUnitNumbers(out, -2), lesson);
});

function fakeResponse() {
  const res = { headers: {}, body: null, statusCode: 200 };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (p) => { res.body = p; return res; };
  return res;
}

test("withUnit: o pedido chega com a numeração interna e a resposta sai com a de verdade", async () => {
  let seen = null; let first = null;
  const handler = withUnit(async (req, res) => {
    seen = JSON.parse(JSON.stringify(req.body));
    first = currentFirstNumber();
    res.setHeader("Content-Disposition", 'attachment; filename="Semana01-sar.zip"');
    // o gerador escreve com a numeração interna (posição 1 = primeira aula deste planejamento)
    return res.json({ lesson: { meta: { weekNumber: 1, weekLabel: "Semana 1" }, blocks: [{ props: { text: "Na Semana 2 veremos o oceano." } }] } });
  });
  const req = { body: { input: { unit: "aula", firstNumber: 3 }, lesson: { meta: { weekNumber: 4, weekLabel: "Aula 4" }, text: "Retome a Aula 3." } } };
  const res = fakeResponse();
  await handler(req, res);
  assert.equal(first, 3);
  assert.equal(seen.lesson.meta.weekNumber, 2);
  assert.equal(seen.lesson.meta.weekLabel, "Aula 2");
  assert.equal(seen.lesson.text, "Retome a Aula 1.");
  assert.equal(res.body.lesson.meta.weekNumber, 3);
  assert.equal(res.body.lesson.meta.weekLabel, "Aula 3");
  assert.equal(res.body.lesson.blocks[0].props.text, "Na Aula 4 veremos o oceano.");
  assert.match(res.headers["content-disposition"], /Semana03-sar\.zip/); // o nome «SemanaNN-» não é traduzido para «Aula» (como já era)
});

test("withUnit sem número inicial: nada muda (curso por semana)", async () => {
  const handler = withUnit(async (req, res) => res.json({ text: "Semana 1", meta: { weekNumber: 1 } }));
  const res = fakeResponse();
  await handler({ body: { input: { unit: "semana" } } }, res);
  assert.deepEqual(res.body, { text: "Semana 1", meta: { weekNumber: 1 } });
});

test("localizeForOutput (PDF, DOCX, ZIP) usa o número de verdade dentro do pedido", async () => {
  let out = "";
  const handler = withUnit(async (req, res) => { out = localizeForOutput("Semana 1 — Semana 2"); return res.json({}); });
  await handler({ body: { input: { unit: "aula", firstNumber: 3 } } }, fakeResponse());
  assert.equal(out, "Aula 3 — Aula 4");
});
