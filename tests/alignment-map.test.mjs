import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { alignmentSheets, buildAlignmentMap } from "../src/alignment-map.js";
import { createWorkbookFromSheets } from "../src/production-xlsx.js";
import { buildAlignmentMatrix } from "../src/pedagogy.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const plan = {
  theme: "Fundamentos",
  learningObjectives: ["Explicar o papel do SIGAA", "Compreender os fluxos", "Elaborar um fluxo de matrícula"],
  activities: [{ id: "activity-1", title: "Fórum" }, { id: "activity-2", title: "Estudo de caso" }, { id: "activity-3", title: "Solta" }],
  assessment: { questions: [{ id: "question-1", q: "a" }, { id: "question-2", q: "b" }] },
  alignmentMatrix: [
    { activities: ["activity-1"], evidence: "Postagem", assessmentQuestions: ["question-1"], activitiesInferred: false, evidenceInferred: false, questionsInferred: false },
    { activities: ["activity-2"], evidence: "Registro", assessmentQuestions: ["question-2"], activitiesInferred: true, evidenceInferred: true, questionsInferred: true },
    { activities: [], assessmentQuestions: [], evidence: "" }
  ]
};

test("o mapa conta só vínculos declarados e mostra os estimados à parte", () => {
  const map = buildAlignmentMap({ input: {}, weeks: [{ lessonPlan: plan }] });
  const [first, second, third] = map.weeks[0].objectives;
  assert.equal(first.hasActivity && first.hasQuestion && first.hasEvidence, true);
  assert.equal(second.hasActivity, false, "ligação estimada não conta");
  assert.equal(second.activities[0].estimated, true);
  assert.equal(second.vague, true);
  assert.equal(third.hasActivity || third.hasQuestion || third.hasEvidence, false);
  assert.deepEqual(map.weeks[0].orphanActivities.map((item) => item.id), ["activity-2", "activity-3"]);
  assert.deepEqual(map.weeks[0].orphanQuestions.map((item) => item.id), ["question-2"]);
  assert.equal(map.summary.withoutActivity, 2);
  assert.equal(map.summary.estimatedLinks, 1);
  const codes = map.issues.map((item) => item.code);
  for (const code of ["objective-no-activity", "objective-no-question", "objective-no-evidence", "objective-vague", "activity-orphan", "question-orphan"]) assert.ok(codes.includes(code), code);
});

test("carga: acima ou abaixo de 15% da meta vira lacuna; dentro da meta não", () => {
  const weeks = [1, 2, 3].map(() => ({ lessonPlan: { learningObjectives: ["Aplicar x"], activities: [{ id: "activity-1", title: "A" }], assessment: { questions: [{ id: "question-1" }] }, alignmentMatrix: [{ activities: ["activity-1"], evidence: "e", assessmentQuestions: ["question-1"] }] } }));
  const map = buildAlignmentMap({ weeks, workload: { weeks: [{ weekNumber: 1, calculatedMinutes: 400, targetMinutes: 300 }, { weekNumber: 2, calculatedMinutes: 200, targetMinutes: 300 }, { weekNumber: 3, calculatedMinutes: 310, targetMinutes: 300 }] } });
  assert.deepEqual(map.weeks.map((week) => week.load.status), ["acima", "abaixo", "ok"]);
  assert.equal(map.summary.overloadedWeeks, 1);
  assert.equal(map.issues.length, 2);
});

test("semana ainda não gerada não gera lacuna; objetivo da UC sem cobertura é apontado", () => {
  const map = buildAlignmentMap({ input: { objectives: ["Explicar o SIGAA e seus fluxos", "Projetar sistemas embarcados"] }, weeks: [{ lessonPlan: plan }, {}] });
  assert.equal(map.weeks[1].generated, false);
  assert.ok(!map.issues.some((item) => item.weekNumber === 2));
  assert.deepEqual(map.courseObjectives.map((item) => item.covered), [true, false]);
  assert.ok(map.issues.some((item) => item.code === "course-objective-uncovered"));
});

test("buildAlignmentMatrix marca como estimado o que preencheu por rodízio, e a marca se mantém", () => {
  const once = buildAlignmentMatrix({ learningObjectives: ["Explicar a", "Comparar b"], activities: [{ id: "activity-1", title: "A" }], assessment: { questions: [{ id: "question-1" }] }, alignmentMatrix: [{ activities: ["activity-1"], evidence: "ok", assessmentQuestions: ["question-1"] }] });
  assert.equal(once[0].activitiesInferred, false);
  assert.equal(once[1].activitiesInferred, true);
  assert.equal(once[1].questionsInferred, true);
  assert.equal(once[1].evidenceInferred, true);
  const twice = buildAlignmentMatrix({ learningObjectives: ["Explicar a", "Comparar b"], activities: [{ id: "activity-1", title: "A" }], assessment: { questions: [{ id: "question-1" }] }, alignmentMatrix: once });
  assert.equal(twice[1].activitiesInferred, true, "normalizar de novo não transforma estimativa em vínculo declarado");
  assert.equal(twice[0].activitiesInferred, false);
});

test("a planilha do mapa abre e tem as três abas", async () => {
  const map = buildAlignmentMap({ weeks: [{ lessonPlan: plan }] });
  const buffer = await createWorkbookFromSheets(JSZip, alignmentSheets(map), "nodebuffer");
  const zip = await JSZip.loadAsync(buffer);
  const workbook = await zip.file("xl/workbook.xml").async("string");
  for (const name of ["Mapa", "Carga", "Lacunas"]) assert.match(workbook, new RegExp(`name="${name}"`));
  assert.match(await zip.file("xl/worksheets/sheet1.xml").async("string"), /LACUNA/);
});

test("public/alignment-map.js, public/bloom.js e public/production-xlsx.js são cópias idênticas de src/", () => {
  for (const file of ["alignment-map.js", "bloom.js", "production-xlsx.js"]) assert.equal(read(`../public/${file}`), read(`../src/${file}`), file);
});
