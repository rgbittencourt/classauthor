import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { RUBRIC_LEVELS, balanceWeights, levelScore, normalizeRubricData, rubricFileSlug, rubricIssues, rubricMoodleCheck, rubricMoodleCsv, rubricSheets } from "../src/rubric-core.js";

const aiAnswer = {
  criteria: [
    { name: "Análise do caso", weight: 40, levels: { excellent: "Analisa com profundidade", good: "Analisa bem", fair: "Analisa superficialmente", insufficient: "Não analisa" } },
    { name: "Argumentação", weight: 35, levels: { excellent: "A", good: "B", fair: "C", insufficient: "D" } },
    { name: "Clareza", weight: 20, levels: { excellent: "A", good: "B", fair: "C", insufficient: "D" } }
  ],
  notes: "Use no feedback"
};

test("public/rubric-core.js é cópia idêntica de src/rubric-core.js", () => {
  assert.equal(fs.readFileSync("public/rubric-core.js", "utf8"), fs.readFileSync("src/rubric-core.js", "utf8"));
});

test("pesos são ajustados para somar exatamente 100", () => {
  assert.deepEqual(balanceWeights([40, 35, 20]), [42, 37, 21]);
  assert.equal(balanceWeights([1, 1, 1]).reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(balanceWeights([0, 0]), [50, 50]);
  assert.deepEqual(balanceWeights([]), []);
});

test("normaliza a resposta da IA e calcula a pontuação de cada nível", () => {
  const rubric = normalizeRubricData(aiAnswer, { id: "r1", title: "Estudo de caso", weekIndex: 1 });
  assert.equal(rubric.criteria.length, 3);
  assert.equal(rubric.criteria.reduce((s, c) => s + c.weight, 0), 100);
  assert.equal(rubric.maxScore, 10);
  assert.equal(rubric.criteria[0].descriptions[0], "Analisa com profundidade");
  const first = rubric.criteria[0];
  assert.equal(levelScore(rubric, first, 0), 4.2);
  assert.equal(levelScore(rubric, first, 1), 3.15);
  assert.equal(levelScore(rubric, first, 3), 0);
  const topTotal = rubric.criteria.reduce((s, c) => s + levelScore(rubric, c, 0), 0);
  assert.ok(Math.abs(topTotal - 10) < 1e-9);
});

test("aceita níveis em lista e rubrica já salva; avisa o que falta", () => {
  const rubric = normalizeRubricData({ criteria: [{ name: "X", weight: 100, descriptions: ["a", "b", "", "d"] }] }, { title: "T" });
  assert.equal(rubric.criteria[0].descriptions[2], "");
  assert.ok(rubricIssues(rubric).some((issue) => /sem descrição/.test(issue)));
  const again = normalizeRubricData(rubric);
  assert.deepEqual(again.criteria, rubric.criteria);
  assert.ok(rubricIssues(normalizeRubricData({})).includes("A rubrica não tem critérios."));
  rubric.criteria[0].weight = 90;
  assert.ok(rubricIssues(rubric).some((issue) => /somam 90%/.test(issue)));
});

// Mesmas regras do importador do Moodle (scripts/validar_csv_moodle.php do Gerador de Rubricas do INOVALAB).
function validatePluginCsv(csv, gradeMax) {
  const lines = csv.split(/\r\n|\n|\r/);
  const header = lines.shift().split(",").map((cell) => cell.trim().toLowerCase());
  for (const name of ["criterion", "level", "level_description", "score"]) if (!header.includes(name)) throw new Error("cabeçalho");
  const rubric = {};
  for (const raw of lines) {
    if (!raw) continue;
    if ((raw.match(/,/g) || []).length !== 3 || /["';]/.test(raw.replace(/'/g, ""))) throw new Error("linha inválida: " + raw);
    const [criterion, , description, score] = raw.split(",");
    (rubric[criterion.replace(/<[^>]*>/g, "").trim()] ||= []).push({ description, score: Number(score) });
  }
  let sum = 0;
  for (const [name, levels] of Object.entries(rubric)) {
    const scores = levels.map((level) => level.score);
    if (new Set(scores).size < scores.length) throw new Error("pontos repetidos em " + name);
    if (scores.some((value, i) => i && value <= scores[i - 1])) throw new Error("níveis fora de ordem em " + name);
    sum += Math.max(...scores);
  }
  if (Math.round(sum * 100) !== Math.round(gradeMax * 100)) throw new Error(`soma ${sum} != ${gradeMax}`);
  return Object.keys(rubric).length;
}

test("CSV do Moodle: cabeçalho do plugin, níveis do menor para o maior e texto sem o que o importador rejeita", () => {
  const rubric = normalizeRubricData({ criteria: [{ name: "Clareza, \"objetiva\"; <b>", weight: 100, levels: { excellent: "Ótimo, claro", good: "Bom; ok", fair: "Médio\nlinha", insufficient: "Fraco" } }] }, { title: "T" });
  const csv = rubricMoodleCsv(rubric);
  const lines = csv.trim().split("\n");
  assert.equal(lines[0], "criterion,level,level_description,score");
  assert.equal(lines.length, 1 + RUBRIC_LEVELS.length);
  assert.ok(lines[1].endsWith(",1,Fraco,0"));
  assert.ok(lines[4].endsWith(",4,Ótimo\u201A claro,10"));
  assert.ok(lines[1].startsWith("Clareza\u201A \u201Cobjetiva\u201D\u201A \u2039b\u203A,1"));
  assert.equal(validatePluginCsv(csv, 10), 1);
  assert.equal(csv.charCodeAt(0), "c".charCodeAt(0)); // sem BOM
});

test("CSV do Moodle passa nas regras do plugin com vários critérios, qualquer nota máxima e pesos quebrados", () => {
  for (const maxScore of [10, 100, 7.5, 20]) {
    const rubric = normalizeRubricData({ ...aiAnswer, maxScore, criteria: [{ name: "A", weight: 33, levels: {} }, { name: "A", weight: 33, levels: {} }, { name: "C", weight: 34, levels: { excellent: "x" } }] }, { title: "T" });
    const csv = rubricMoodleCsv(rubric);
    assert.equal(validatePluginCsv(csv, maxScore), 3, `nota ${maxScore}`);
    assert.match(csv, /^A \(2\),/m);
  }
});

test("o Moodle recusa pontos repetidos: o app bloqueia nota máxima pequena demais e peso 0", () => {
  const tiny = normalizeRubricData({ maxScore: 0.05, criteria: [{ name: "A", weight: 50, levels: {} }, { name: "B", weight: 50, levels: {} }] }, { title: "T" });
  assert.ok(rubricMoodleCheck(tiny).errors.length > 0);
  assert.ok(rubricIssues(tiny).some((issue) => /^CSV do Moodle/.test(issue)));
  const zero = normalizeRubricData({ criteria: [{ name: "A", weight: 100, levels: {} }, { name: "B", weight: 0, levels: {} }] }, { title: "T" });
  zero.criteria[1].weight = 0; zero.criteria[0].weight = 100;
  const check = rubricMoodleCheck(zero);
  assert.equal(check.errors.length, 0);
  assert.ok(check.warnings.some((warning) => /Ficam de fora/.test(warning)));
  assert.equal(validatePluginCsv(rubricMoodleCsv(zero), 10), 1);
});

test("planilha: uma aba por rubrica, nomes únicos e linha de nota máxima", () => {
  const a = normalizeRubricData(aiAnswer, { title: "Estudo de caso" });
  const b = normalizeRubricData(aiAnswer, { title: "Estudo de caso" });
  const sheets = rubricSheets([a, b]);
  assert.equal(sheets.length, 2);
  assert.notEqual(sheets[0].name, sheets[1].name);
  assert.equal(sheets[0].rows.length, 4);
  assert.equal(sheets[0].columns.length, 6);
  assert.match(sheets[0].rows[0][2], /\[4\.2 pts\]/);
  assert.equal(rubricFileSlug("Estudo de Caso: Ética!"), "estudo-de-caso-etica");
});

import { createMediationMaterialPdf } from "../src/pdf.js";
import { buildFallbackLesson, normalizeCourseInput } from "../src/aula-schema.js";
import { buildTeacherGuides } from "../src/teacher-guide.js";
import { buildRubricPrompt } from "../src/rubric.js";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

test("o Material de Mediação só ganha a seção de rubricas quando há rubricas", async () => {
  const input = normalizeCourseInput({ title: "Curso com rubrica", weeks: 2, objectives: ["Analisar"] });
  const guides = buildTeacherGuides(input, [buildFallbackLesson(input, 0)], [{}]);
  const rubric = normalizeRubricData(aiAnswer, { title: "Estudo de caso", weekIndex: 0, source: { kind: "activity", id: "a1", title: "Estudo de caso" } });
  const without = await createMediationMaterialPdf(input, guides, null, {});
  const withRubric = await createMediationMaterialPdf(input, guides, null, { rubrics: [rubric] });
  assert.ok(withRubric.length > without.length);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "rub-")), "m.pdf");
  const read = (buffer) => { fs.writeFileSync(file, buffer); try { return execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" }); } catch { return null; } };
  const text = read(withRubric);
  if (text == null) return;
  assert.match(text, /Rubricas de avaliação/);
  assert.match(text, /Análise do caso/);
  assert.match(text, /4\.2 pts/);
  assert.doesNotMatch(read(without), /Rubricas de avaliação/);
});

test("o pedido à IA usa o contexto da aula e os critérios já previstos", () => {
  const input = normalizeCourseInput({ title: "Curso X", weeks: 2, objectives: ["Analisar"] });
  const week = { lessonPlan: { theme: "Tema da aula", learningObjectives: ["Aplicar a técnica"] } };
  const prompt = buildRubricPrompt(input, 0, week, { kind: "activity", title: "Estudo de caso", instructions: "Leia e responda", criteria: ["Clareza", "Fundamentação"] }, { instruction: "Inclua ética" });
  assert.match(prompt, /Tema da aula/);
  assert.match(prompt, /Aplicar a técnica/);
  assert.match(prompt, /Clareza; Fundamentação/);
  assert.match(prompt, /Inclua ética/);
  assert.match(prompt, /soma dos pesos é 100/);
});

import { RUBRIC_LEVELS_ASCENDING, rubricFieldValue, rubricHtmlTable, rubricPlainText, rubricTsv } from "../src/rubric-core.js";

test("rubrica para copiar: texto, tabela para planilha, tabela HTML e campos do editor do Moodle", () => {
  const rubric = normalizeRubricData({ criteria: [{ name: "Clareza <b>", weight: 100, levels: { excellent: "Ótimo & claro", good: "Bom", fair: "Médio", insufficient: "Fraco" } }] }, { title: "Estudo" });
  const plain = rubricPlainText(rubric);
  assert.match(plain, /Rubrica: Estudo/);
  assert.match(plain, /Excelente \(10 pts\): Ótimo & claro/);
  assert.match(plain, /Bom \(7,5 pts\)/);
  const tsv = rubricTsv(rubric).trim().split("\n");
  assert.equal(tsv.length, 2);
  assert.equal(tsv[1].split("\t").length, 6);
  assert.match(tsv[1], /\[7,5 pts\]/);
  const html = rubricHtmlTable(rubric);
  assert.match(html, /<table/);
  assert.match(html, /Clareza &lt;b&gt;/);
  assert.match(html, /Ótimo &amp; claro/);
  assert.equal(rubricFieldValue(rubric, 0, "name"), "Clareza <b>");
  assert.equal(rubricFieldValue(rubric, 0, "def3"), "Fraco");
  assert.equal(rubricFieldValue(rubric, 0, "pts1"), "7,5");
  assert.equal(rubricFieldValue(rubric, 5, "name"), "");
  assert.equal(RUBRIC_LEVELS_ASCENDING[0].label, "Insuficiente");
  assert.equal(RUBRIC_LEVELS_ASCENDING[0].position, 3);
  rubric.criteria[0].weight = 0;
  assert.ok(rubricIssues(rubric).some((issue) => /peso 0/.test(issue)));
});
