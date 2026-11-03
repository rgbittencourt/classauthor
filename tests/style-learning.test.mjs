import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { blocksText, splitSentences, diffSentences, habitsFrom, normalizeStyleRules, activeStyleGuide, styleGuideBlock } from "../src/style-learning.js";

test("a cópia pública é idêntica à do servidor", () => {
  assert.equal(readFileSync(new URL("../public/style-learning.js", import.meta.url), "utf8"), readFileSync(new URL("../src/style-learning.js", import.meta.url), "utf8"));
});

test("blocksText junta só texto (sem endereços nem códigos de cor)", () => {
  const text = blocksText([{ id: "a", type: "prose", bg: "paper", props: { body: "<p>Primeira frase do bloco aqui.</p>", src: "https://x.org/a.png", children: [{ type: "titulo", props: { text: "Título" } }] } }]);
  assert.match(text, /Primeira frase do bloco aqui\./);
  assert.doesNotMatch(text, /https|paper/);
});

test("splitSentences ignora trechos curtos demais", () => {
  assert.deepEqual(splitSentences("Introdução. Esta é uma frase completa e longa. Sim."), ["Esta é uma frase completa e longa."]);
});

const before = [
  "Neste contexto, é importante destacar que o planejamento orienta toda a prática docente.",
  "Sem dúvida, a avaliação formativa é fundamental para o processo de ensino e aprendizagem.",
  "Neste contexto, é importante ressaltar que o estudante precisa de retorno rápido.",
  "Um parágrafo que o professor vai cortar inteiro porque não acrescenta nada novo.",
  "Esta frase fica exatamente igual no texto final do professor."
].join(" ");
const after = [
  "O planejamento orienta toda a prática docente.",
  "A avaliação formativa sustenta o processo de ensino e aprendizagem.",
  "O estudante precisa de retorno rápido.",
  "Esta frase fica exatamente igual no texto final do professor.",
  "Acrescentei esta frase nova com um exemplo do meu campus de trabalho."
].join(" ");

test("diffSentences separa reescritas, cortes e acréscimos", () => {
  const d = diffSentences(before, after);
  assert.equal(d.counts.rewritten, 3);
  assert.equal(d.counts.cut, 1);
  assert.equal(d.counts.added, 1);
  assert.ok(d.pairs.every((p) => p.before && p.after));
  assert.match(d.cuts[0], /cortar inteiro/);
  assert.match(d.adds[0], /meu campus/);
});

test("textos iguais não geram diferenças", () => {
  assert.equal(diffSentences(before, before).changed, 0);
});

test("habitsFrom acha a expressão que some em vários pares", () => {
  const { pairs } = diffSentences(before, after);
  const habits = habitsFrom(pairs).map((h) => h.text).join(" | ");
  assert.match(habits, /contexto/);
  assert.equal(habitsFrom(pairs).filter((h) => /contexto|importante|destacar/.test(h.text)).length >= 1, true);
});

test("normalizeStyleRules limpa, tira repetidas e respeita o limite", () => {
  const rules = normalizeStyleRules(["Prefira frases curtas.", "prefira frases curtas", "x", { text: "Evite 'neste contexto'.", on: false }, 7]);
  assert.equal(rules.length, 2);
  assert.equal(activeStyleGuide(rules).length, 1);
  assert.equal(normalizeStyleRules(Array.from({ length: 60 }, (_, i) => `Regra de estilo número ${i} bem diferente`)).length, 30);
});

test("styleGuideBlock só existe com regras", () => {
  assert.equal(styleGuideBlock([]), "");
  assert.match(styleGuideBlock(["Prefira frases curtas."]), /ESTILO DO PROFESSOR[\s\S]*- Prefira frases curtas\./);
});
