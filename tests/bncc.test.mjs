import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { BNCC_CATALOG, bnccCandidates, bnccCatalogFor, bnccReferenceBlock, normalizeBnccAlignment, normalizeEducationIdentity, validateBnccAlignment } from "../src/bncc.js";
import { normalizeCourseInput, normalizeLessonPlan } from "../src/aula-schema.js";
import { buildLessonPlanPrompt, lessonPlanToText } from "../src/lesson-plan.js";
import { buildTeacherGuides } from "../src/teacher-guide.js";

const fundamental = { educationLevel: "fundamental", grade: 4, component: "MA" };
const medio = { educationLevel: "medio", grade: 2, component: "CNT" };

test("catálogo oficial cobre Fundamental e Médio e a cópia pública é idêntica", () => {
  assert.ok(BNCC_CATALOG.length >= 1500);
  assert.ok(BNCC_CATALOG.some((item) => item.code === "EF04MA01" && /números naturais/.test(item.description)));
  assert.ok(BNCC_CATALOG.some((item) => item.code === "EM13CNT101" && /energia/.test(item.description)));
  assert.equal(fs.readFileSync("src/bncc.js", "utf8"), fs.readFileSync("public/bncc.js", "utf8"));
  assert.equal(fs.readFileSync("src/bncc-catalog.js", "utf8"), fs.readFileSync("public/bncc-catalog.js", "utf8"));
});

test("identidade educacional aciona BNCC somente para Fundamental e Médio", () => {
  assert.equal(normalizeEducationIdentity(fundamental).bnccEnabled, true);
  assert.equal(normalizeEducationIdentity(medio).bnccEnabled, true);
  assert.equal(normalizeEducationIdentity({ educationLevel: "graduacao" }).bnccEnabled, false);
  assert.equal(normalizeEducationIdentity({ educationLevel: "pos-lato" }).bnccEnabled, false);
});

test("filtro respeita ano e componente, inclusive faixas compartilhadas", () => {
  const items = bnccCatalogFor(fundamental);
  assert.ok(items.some((item) => item.code === "EF04MA01"));
  assert.ok(items.every((item) => item.code.startsWith("EF") && item.code.slice(4, 6) === "MA"));
  assert.ok(!items.some((item) => item.code.startsWith("EF05MA")));
  const language = bnccCatalogFor({ educationLevel: "fundamental", grade: 8, component: "LP" });
  assert.ok(language.some((item) => item.code.startsWith("EF69LP")));
  assert.ok(language.some((item) => item.code.startsWith("EF89LP")));
});

test("motor seleciona candidatos sem enviar o catálogo inteiro ao prompt", () => {
  const candidates = bnccCandidates(fundamental, "frações números naturais cálculo problemas", 12);
  assert.equal(candidates.length, 12);
  assert.ok(candidates.some((item) => /número|cálculo|fraç/i.test(item.description)));
  const block = bnccReferenceBlock({ title: "Números naturais", content: "cálculo", objectives: ["Resolver problemas"], educationIdentity: fundamental });
  assert.match(block, /REFERENCIAL BNCC OBRIGATÓRIO/);
  assert.match(block, /EF04MA/);
  assert.ok(block.length < 14000);
});

test("validador aceita vínculo completo e bloqueia código incompatível", () => {
  const official = bnccCatalogFor(fundamental).find((item) => item.code === "EF04MA01");
  const good = { bnccAlignment: [{ code: official.code, description: official.description, objective: "Ordenar números", activity: "Desafio de ordenação", evidence: "Sequência justificada" }] };
  assert.equal(validateBnccAlignment(good, fundamental).pass, true);
  const bad = { bnccAlignment: [{ code: "EF05MA01", description: "inventada", objective: "x", activity: "y", evidence: "z" }] };
  const report = validateBnccAlignment(bad, fundamental);
  assert.equal(report.pass, false);
  assert.match(report.issues.join(" "), /incompatível/);
});

test("normalização preserva identidade e usa a descrição oficial", () => {
  const input = normalizeCourseInput({ title: "Matemática", educationIdentity: fundamental });
  assert.equal(input.educationIdentity.componentLabel, "Matemática");
  const plan = normalizeLessonPlan({ bnccAlignment: [{ code: "EF04MA01", description: "texto alterado", objective: "O", activity: "A", evidence: "E" }] }, input, 0);
  assert.match(plan.bnccAlignment[0].description, /números naturais/);
  assert.equal(plan.pedagogicalReview.checks.find((item) => item.id === "bncc-alignment").pass, true);
  assert.equal(normalizeBnccAlignment([], fundamental).length, 0);
});

test("BNCC entra antes da geração, na aprovação do plano e no Material do Professor", () => {
  const input = normalizeCourseInput({ title: "Matemática", content: "números naturais", objectives: ["Resolver problemas"], weeks: 1, educationIdentity: fundamental });
  assert.match(buildLessonPlanPrompt(input, 0), /REFERENCIAL BNCC OBRIGATÓRIO/);
  const official = bnccCatalogFor(fundamental).find((item) => item.code === "EF04MA01");
  const alignment = { code: official.code, description: official.description, objective: "Ordenar números", activity: "Desafio", evidence: "Sequência" };
  assert.match(lessonPlanToText({ bnccAlignment: [alignment] }), /ALINHAMENTO COM A BNCC:[\s\S]*EF04MA01/);
  const lessonPlan = normalizeLessonPlan({ bnccAlignment: [alignment] }, input, 0);
  const guides = buildTeacherGuides(input, [{ lessonPlan }], [{}]);
  assert.equal(guides[0].bnccAlignment[0].code, "EF04MA01");
});

