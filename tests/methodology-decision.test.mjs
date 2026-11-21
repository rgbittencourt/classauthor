import test from "node:test";
import assert from "node:assert/strict";
import { METHODOLOGY_DECISION_GUIDES, methodologyDecisionGuide } from "../public/methodology-decision.js";

const expected = [
  "sala-invertida", "rotacao-estacoes", "laboratorio-rotacional", "rotacao-individual", "flex", "a-la-carte", "virtual-aprimorado",
  "estudo-de-caso", "pbl", "projetos", "peer-instruction", "ensino-sob-medida", "tbl", "poe", "gamificacao",
  "aprendizagem-jogos", "storytelling", "design-thinking", "escape-room", "pesquisa", "wac", "juri-simulado"
];

test("guia de decisão cobre todas as metodologias validadas", () => {
  assert.deepEqual(METHODOLOGY_DECISION_GUIDES.map((item) => item.id).sort(), expected.sort());
  assert.equal(new Set(METHODOLOGY_DECISION_GUIDES.map((item) => item.id)).size, expected.length);
});

test("cada metodologia oferece informação suficiente para uma decisão consciente", () => {
  for (const item of METHODOLOGY_DECISION_GUIDES) {
    assert.ok(item.label.length > 3, `${item.id}: nome`);
    assert.ok(item.summary.length > 40, `${item.id}: funcionamento`);
    assert.ok(item.bestUsedWhen.length >= 2, `${item.id}: situações de uso`);
    assert.ok(item.steps.length >= 4, `${item.id}: operacionalização`);
    assert.ok(item.strengths.length >= 2, `${item.id}: vantagens`);
    assert.ok(item.limitations.length >= 2, `${item.id}: desvantagens`);
    assert.ok(item.risks.length >= 2, `${item.id}: riscos`);
    assert.ok(item.risks.every(({ risk, prevention }) => risk && prevention), `${item.id}: prevenção dos riscos`);
    assert.equal(methodologyDecisionGuide(item.id), item);
  }
  assert.equal(methodologyDecisionGuide("inexistente"), null);
});

