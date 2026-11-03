import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { FICHA_EVALUATION_IFSC, createFichaDocx, fichaChecks, fichaDefaults, formatHours, periodOf, weightsTotal } from "../src/ficha-disciplina.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const lesson = (n, theme) => ({
  meta: { calendarStartDate: `2026-08-${String(3 + (n - 1) * 7).padStart(2, "0")}`, calendarEndDate: `2026-08-${String(9 + (n - 1) * 7).padStart(2, "0")}` },
  lessonPlan: {
    theme, contentSections: [{ title: `Conceito de ${theme}` }, { title: "Aplicação" }],
    activities: [{ id: "a1", title: "Fórum de discussão", criteria: ["Participação", "Argumentação"], required: true }, { title: "Opcional", required: false }],
    assessment: { questions: [1, 2, 3].map((i) => ({ id: `q${i}` })) },
    activeMethodology: { label: "Metodologia: Sala de aula invertida" },
    references: [{ citation: "TERRA, J. C. C. **Gestão do conhecimento**. São Paulo: Negócio, 2000.", verified: true }, { citation: "ZZZ, A. **Obra não conferida**. 2020.", verified: false }]
  }
});
const input = { title: "Tecnologias para a Gestão Educacional", weeks: 2, hoursPerWeek: 30, startDate: "2026-08-03", objectives: "Aplicar tecnologias.\nAnalisar a gestão.", references: "LEÃO, P.A.S. **O Papel do Governo Eletrônico**. 2007." };
const build = () => fichaDefaults({ input, weeks: [lesson(1, "Sistemas de informação"), lesson(2, "Gestão do conhecimento")], generalPlan: { webPracticeSchedule: [{ id: "p1" }, { id: "p2" }] }, author: "Fulana de Tal" });

test("a ficha nasce do planejamento: carga, período, ementa, conteúdo e instrumentos", () => {
  const ficha = build();
  assert.equal(ficha.hours, "60 horas");
  assert.equal(ficha.period, "2026/2");
  assert.equal(periodOf("2026-03-02"), "2026/1");
  assert.equal(ficha.ementa, "Sistemas de informação; Gestão do conhecimento.");
  assert.deepEqual(ficha.contents.map((item) => item.text).slice(0, 4), ["1. Sistemas de informação", "1.1. Conceito de Sistemas de informação", "1.2. Aplicação", "2. Gestão do conhecimento"]);
  assert.deepEqual(ficha.professors, [{ name: "Fulana de Tal", email: "" }]);
  assert.equal(ficha.instruments.length, 4, "atividade opcional não entra; cada semana tem 1 obrigatória + o questionário");
  assert.equal(ficha.instruments[0].schedule, "De 03/08/2026 à 09/08/2026");
  assert.equal(ficha.instruments[0].criteria, "Participação; Argumentação");
  assert.match(ficha.method, /2 encontros de prática/);
  assert.match(ficha.method, /Sala de aula invertida/);
  assert.equal(ficha.evaluation, FICHA_EVALUATION_IFSC);
  assert.equal(formatHours(1), "1 hora");
  assert.equal(formatHours(7.5), "7,5 horas");
});

test("referências: as suas e as conferidas entram; a não conferida fica desmarcada", () => {
  const ficha = build();
  const byStart = (start) => ficha.references.find((item) => item.citation.startsWith(start));
  assert.equal(byStart("LEÃO").include, true);
  assert.equal(byStart("TERRA").include, true);
  assert.equal(byStart("ZZZ").include, false);
  assert.equal(ficha.references.filter((item) => item.citation.startsWith("TERRA")).length, 1, "sem duplicar a referência repetida nas semanas");
  assert.ok(fichaChecks(ficha).some((item) => /não foram conferidas/.test(item)));
});

test("os avisos pedem curso, e-mail e pesos que somem 100%", () => {
  const ficha = build();
  assert.ok(fichaChecks(ficha).includes("Preencha o curso."));
  assert.ok(fichaChecks(ficha).includes("Falta o e-mail de algum professor."));
  assert.ok(fichaChecks(ficha).includes("Defina o peso de cada instrumento de avaliação."));
  ficha.instruments[0].weight = "20%"; ficha.instruments[1].weight = "30";
  assert.equal(weightsTotal(ficha), 50);
  assert.ok(fichaChecks(ficha).some((item) => /somam 50%/.test(item)));
  ficha.instruments[2].weight = "50";
  assert.ok(!fichaChecks(ficha).some((item) => /somam|peso/.test(item)));
});

test("o .docx tem as seções do modelo, o negrito das referências e o rodapé", async () => {
  const ficha = build();
  ficha.course = "Pós-Graduação Lato Sensu"; ficha.professors[0].email = "a@b.c";
  const logo = new Uint8Array(readFileSync(new URL("../public/brand/ifsc-institutional-mark.png", import.meta.url)));
  const zip = await JSZip.loadAsync(await createFichaDocx(JSZip, ficha, { logo, output: "nodebuffer" }));
  const xml = await zip.file("word/document.xml").async("string");
  for (const title of ["PLANO DE ENSINO", "1. EMENTA", "2. OBJETIVOS", "3. CONTEÚDO PROGRAMÁTICO E CARGA HORÁRIA (C.H.)", "4. MÉTODO DE ENSINO E RECURSOS DIDÁTICOS", "5. AVALIAÇÃO", "6. INSTRUMENTOS E CRITÉRIOS DE AVALIAÇÃO", "REFERÊNCIAS"]) assert.ok(xml.includes(title), title);
  assert.ok(xml.includes("60 horas") && xml.includes("Pós-Graduação Lato Sensu"));
  assert.match(xml, /<w:b\/>[^]*?Gestão do conhecimento<\/w:t>/);
  assert.ok(!xml.includes("**"), "os ** viram negrito, não aparecem no texto");
  assert.ok(!xml.includes("Obra não conferida"), "referência desmarcada fica de fora");
  assert.ok(zip.file("word/header1.xml") && zip.file("word/media/logo.png") && zip.file("word/footer1.xml"));
  assert.match(await zip.file("word/footer1.xml").async("string"), /CNPJ/);
  const semLogo = await JSZip.loadAsync(await createFichaDocx(JSZip, { ...ficha, header: false }, { logo, output: "nodebuffer" }));
  assert.equal(semLogo.file("word/header1.xml"), null);
});

test("public/ficha-disciplina.js e public/abnt.js são cópias idênticas de src/", () => {
  for (const file of ["ficha-disciplina.js", "abnt.js"]) assert.equal(read(`../public/${file}`), read(`../src/${file}`), file);
});
