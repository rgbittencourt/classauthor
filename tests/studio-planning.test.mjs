import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { PLAN_STEPS, partitionPlanningSectors, planningStepForField } from "../public/studio-planning.js";

function fixture() {
  const { document } = parseHTML("<!doctype html><html><body><form id='course-form'></form></body></html>");
  const form = document.getElementById("course-form");
  const sectors = [];
  const makeField = (id, type = "text") => {
    const wrapper = document.createElement("label");
    wrapper.className = "field";
    const input = document.createElement(type === "textarea" ? "textarea" : "input");
    input.id = id;
    wrapper.append(input);
    return wrapper;
  };
  for (let index = 0; index < 7; index += 1) {
    const sector = document.createElement("details");
    sector.className = "briefing-sector";
    sector.id = `sector-${String(index + 1).padStart(2, "0")}`;
    const summary = document.createElement("summary");
    summary.className = "sector-summary";
    sector.append(summary);
    const body = document.createElement("div");
    body.className = "sector-body";
    sector.append(body);
    form.append(sector);
    sectors.push(sector);
  }
  const identityGrid = document.createElement("div");
  identityGrid.className = "field-grid two";
  ["course-title", "audience", "level", "education-level", "education-grade", "education-component"].forEach((id) => identityGrid.append(makeField(id)));
  sectors[0].querySelector(".sector-body").append(identityGrid);
  ["weeks", "hours", "first-number"].forEach((id) => sectors[1].querySelector(".sector-body").append(makeField(id)));
  ["resource-default-videos", "resource-default-articles", "resource-default-required", "resource-default-level", "resource-plan-weeks"].forEach((id) => sectors[2].querySelector(".sector-body").append(makeField(id)));
  ["composition-plan"].forEach((id) => sectors[3].querySelector(".sector-body").append(makeField(id)));
  const intention = sectors[4].querySelector(".sector-body");
  const assist = document.createElement("div");
  assist.className = "studio-assist-row";
  assist.id = "assist-row";
  intention.append(assist, makeField("objectives", "textarea"), makeField("content", "textarea"), makeField("didactic-mode"));
  const assistantNote = document.createElement("p");
  assistantNote.id = "assistant-note";
  intention.append(assistantNote);
  const method = document.createElement("div");
  method.id = "methodology-box";
  method.append(makeField("pedagogical-approach"), makeField("methodology-default"), makeField("methodology-weeks"));
  intention.append(method);
  const academic = document.createElement("div");
  academic.className = "academic-profile-box";
  ["citation-style", "academic-scope", "academic-target-words", "academic-min-sections", "academic-min-references", "academic-primary-sources", "academic-authors", "academic-frameworks", "academic-avoid", "academic-source-policy"].forEach((id) => academic.append(makeField(id)));
  intention.append(academic);
  const practice = document.createElement("div");
  practice.id = "practice-fields";
  sectors[5].querySelector(".sector-body").append(practice, makeField("practice-count"));
  const practiceToggle = document.createElement("input");
  practiceToggle.id = "practice-enabled";
  sectors[5].querySelector(".sector-summary").append(practiceToggle);
  const supportBody = sectors[6].querySelector(".sector-body");
  ["materials-list", "add-material", "references", "videos", "video-search-suggestions", "image-links", "image-search-suggestions"].forEach((id) => supportBody.append(makeField(id)));
  return { document, sectors, makeField };
}

test("Planejar tem 13 passos menores e os campos originais permanecem únicos", () => {
  const { document, sectors } = fixture();
  const originalFields = [...document.querySelectorAll("[id]")];
  const originalIds = originalFields.map((field) => field.id).sort();
  const chunks = partitionPlanningSectors(sectors);

  assert.equal(PLAN_STEPS.length, 13);
  assert.deepEqual(PLAN_STEPS.map((step) => step.label), [
    "Curso e turma", "Contexto de ensino", "Tempo e calendário", "Objetivos e conteúdos",
    "Abordagem e metodologias", "Perfil acadêmico", "Práticas e laboratório", "Recursos e leituras",
    "Composição ClassAtelier", "Materiais de apoio", "Referências e vídeos", "Imagens e diagramas", "Conferir e gerar"
  ]);
  assert.equal(chunks.size, 12);
  const newIds = [...document.querySelectorAll("[id]")].map((field) => field.id);
  assert.equal(newIds.length, new Set(newIds).size);
  assert.deepEqual(newIds.sort(), originalIds);
  originalFields.forEach((field) => assert.equal(field.isConnected, true));
  assert.equal(chunks.get("course").querySelector("#course-title"), document.getElementById("course-title"));
  assert.equal(chunks.get("education").querySelector("#education-component"), document.getElementById("education-component"));
  assert.equal(chunks.get("methodology").querySelector("#methodology-box"), document.getElementById("methodology-box"));
  assert.equal(chunks.get("academic").querySelector("#academic-authors"), document.getElementById("academic-authors"));
  assert.equal(chunks.get("support").querySelector("#materials-list"), document.getElementById("materials-list"));
  assert.equal(chunks.get("references").querySelector("#videos"), document.getElementById("videos"));
  assert.equal(chunks.get("images").querySelector("#image-links"), document.getElementById("image-links"));
});

test("campos movidos continuam respondendo a eventos já registrados", () => {
  const { document, sectors } = fixture();
  const objectives = document.getElementById("objectives");
  let events = 0;
  objectives.addEventListener("input", () => { events += 1; });
  partitionPlanningSectors(sectors);
  objectives.dispatchEvent(new document.defaultView.Event("input", { bubbles: true }));
  assert.equal(events, 1);
  assert.equal(document.getElementById("objectives"), objectives);
});

test("validação/foco mapeia os campos para os passos corretos, inclusive práticas opcionais", () => {
  const { document, sectors } = fixture();
  const chunks = partitionPlanningSectors(sectors);
  chunks.set("check", document.createElement("div"));
  assert.equal(planningStepForField(document.getElementById("course-title")), 0);
  assert.equal(planningStepForField(document.getElementById("education-component")), 1);
  assert.equal(planningStepForField(document.getElementById("weeks")), 2);
  assert.equal(planningStepForField(document.getElementById("objectives")), 3);
  assert.equal(planningStepForField(document.getElementById("methodology-default")), 4);
  assert.equal(planningStepForField(document.getElementById("academic-authors")), 5);
  assert.equal(planningStepForField(document.getElementById("practice-enabled")), 6);
  assert.equal(planningStepForField(document.getElementById("resource-default-videos")), 7);
  assert.equal(planningStepForField(document.getElementById("composition-plan")), 8);
  assert.equal(planningStepForField(document.getElementById("materials-list")), 9);
  assert.equal(planningStepForField(document.getElementById("videos")), 10);
  assert.equal(planningStepForField(document.getElementById("image-links")), 11);
});
