import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { initializeStudio } from "../public/studio-ui.js";

const EXPECTED_GROUPS = [
  { id: "course", label: "O curso", firstStep: "course" },
  { id: "pedagogy", label: "Escolhas pedagógicas", firstStep: "objectives" },
  { id: "materials", label: "Materiais da aula", firstStep: "resources" },
  { id: "check", label: "Conferir e gerar", firstStep: "check" }
];
const EXPECTED_STEPS = [
  "course", "education", "time", "objectives", "methodology", "academic", "practice",
  "resources", "composition", "support", "references", "images", "check"
];
const RESULT_LINKS = [
  ["results-load", "Carga por atividade"],
  ["results-review", "Checklists"],
  ["results-weeks", "Semanas planejadas"],
  ["results-production", "Produção audiovisual"]
];

function field(document, id, { type = "input", value = "1", options = [] } = {}) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";
  const control = type === "select" ? document.createElement("select") : type === "textarea" ? document.createElement("textarea") : document.createElement("input");
  control.id = id;
  if (type === "select") {
    options.forEach(([optionValue, label]) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = label;
      option.selected = optionValue === value;
      control.append(option);
    });
  } else if (type !== "textarea") {
    control.value = value;
  }
  wrapper.append(control);
  return wrapper;
}

function fixture() {
  const { document, window } = parseHTML("<!doctype html><html><head></head><body></body></html>");
  const intro = document.createElement("section");
  intro.className = "intro";
  intro.innerHTML = '<h1>Do tema geral a uma trilha de aulas semanais.</h1><p class="intro-copy">Descrição original.</p>';

  const form = document.createElement("form");
  form.id = "course-form";
  const workspace = document.createElement("div");
  workspace.className = "workspace-grid";
  const center = document.createElement("div");
  center.className = "form-column";
  const navigation = document.createElement("aside");
  navigation.className = "navigation-column";
  const summary = document.createElement("aside");
  summary.className = "summary-column";
  const actions = document.createElement("section");
  actions.className = "sidebar-actions";
  const actionIds = ["recalculate-button", "alignment-map-button", "rubrics-button", "zip-button", "teacher-pdf-button", "ficha-button", "production-sheet-button"];
  actionIds.forEach((id) => {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    actions.append(button);
  });
  const styleButton = document.createElement("button");
  styleButton.id = "style-button";
  styleButton.type = "button";
  actions.append(styleButton);
  summary.append(actions);

  const sectors = [];
  for (let index = 0; index < 7; index += 1) {
    const sector = document.createElement("details");
    sector.className = "briefing-sector";
    sector.id = `sector-${String(index + 1).padStart(2, "0")}`;
    const heading = document.createElement("summary");
    heading.className = "sector-summary";
    const body = document.createElement("div");
    body.className = "sector-body";
    sector.append(heading, body);
    center.append(sector);
    sectors.push(sector);
  }
  const make = (id, options = {}) => field(document, id, options);
  const identity = document.createElement("div");
  identity.className = "field-grid two";
  identity.append(
    make("course-title", { value: "Curso de teste" }),
    make("audience", { value: "Turma de teste" }),
    make("level", { type: "select", value: "intermediario", options: [["intermediario", "Intermediário"], ["avancado", "Avançado"]] }),
    make("education-level", { type: "select", value: "outro", options: [["outro", "Outro / não informado"], ["graduacao", "Graduação"]] }),
    make("education-grade"),
    make("education-component")
  );
  sectors[0].querySelector(".sector-body").append(identity);

  sectors[1].querySelector(".sector-body").append(
    make("course-unit", { type: "select", value: "aula", options: [["aula", "Aula"], ["semana", "Semana"]] }),
    make("weeks", { value: "4" }), make("hours", { value: "3" })
  );
  sectors[2].querySelector(".sector-body").append(
    make("resource-default-videos"), make("resource-default-articles"), make("resource-default-required"), make("resource-default-level"), make("resource-plan-weeks")
  );
  sectors[3].querySelector(".sector-body").append(make("composition-plan"));

  const intention = sectors[4].querySelector(".sector-body");
  const assistButton = document.createElement("button");
  assistButton.id = "assist-button";
  assistButton.type = "button";
  const objectives = make("objectives", { type: "textarea" });
  objectives.querySelector("#objectives").value = "Analisar um caso";
  const content = make("content", { type: "textarea" });
  content.querySelector("#content").value = "Conteúdo-base";
  intention.append(objectives, content, make("didactic-mode"));
  intention.append(make("assistant-note"));
  const methodology = document.createElement("div");
  methodology.id = "methodology-box";
  methodology.append(
    make("pedagogical-approach", { type: "select", value: "nova", options: [["nova", "Nova"]] }),
    make("methodology-default", { type: "select", value: "none", options: [["none", "Nenhuma específica"]] }),
    make("methodology-weeks")
  );
  intention.append(methodology);
  const academic = document.createElement("div");
  academic.className = "academic-profile-box";
  academic.append(
    make("citation-style", { type: "select", value: "abnt", options: [["abnt", "ABNT"]] }),
    make("academic-target-words", { value: "2800" }), make("academic-min-sections", { value: "6" }),
    make("academic-min-references", { value: "4" }), make("academic-primary-sources"), make("academic-authors"),
    make("academic-frameworks"), make("academic-avoid"), make("academic-scope"), make("academic-source-policy")
  );
  intention.append(academic, assistButton);

  const practiceToggle = document.createElement("input");
  practiceToggle.id = "practice-enabled";
  practiceToggle.type = "checkbox";
  sectors[5].querySelector(".sector-summary").append(practiceToggle);
  const practiceFields = document.createElement("div");
  practiceFields.id = "practice-fields";
  sectors[5].querySelector(".sector-body").append(practiceFields, make("practice-count"));

  const supportBody = sectors[6].querySelector(".sector-body");
  const materials = document.createElement("div");
  materials.id = "materials-list";
  const addMaterial = document.createElement("button");
  addMaterial.id = "add-material";
  addMaterial.type = "button";
  supportBody.append(materials, addMaterial);
  ["references", "videos", "video-search-suggestions", "image-links", "image-search-suggestions"].forEach((id) => supportBody.append(make(id, { type: "textarea" })));

  const results = document.createElement("section");
  results.id = "results-section";
  results.className = "hidden";
  const generalPlan = document.createElement("section");
  generalPlan.id = "general-plan";
  generalPlan.className = "hidden";
  const resultsLoad = document.createElement("section");
  resultsLoad.id = "results-load";
  const resultsReview = document.createElement("section");
  resultsReview.id = "results-review";
  const resultsWeeks = document.createElement("details");
  resultsWeeks.id = "results-weeks";
  const weekGrid = document.createElement("div");
  weekGrid.id = "week-grid";
  resultsWeeks.append(weekGrid);
  const resultsProduction = document.createElement("details");
  resultsProduction.id = "results-production";
  results.append(generalPlan, resultsLoad, resultsReview, resultsWeeks, resultsProduction);
  center.append(results);
  workspace.append(center, navigation, summary);
  form.append(workspace);

  const nav = document.createElement("nav");
  nav.id = "project-navigation";
  for (const sector of sectors) {
    const link = document.createElement("a");
    link.href = `#${sector.id}`;
    link.dataset.scrollTo = sector.id;
    link.textContent = sector.id;
    nav.append(link);
  }
  RESULT_LINKS.forEach(([target, label]) => {
    const link = document.createElement("a");
    link.href = `#${target}`;
    link.dataset.scrollTo = target;
    link.textContent = `${label} →`;
    nav.append(link);
  });
  navigation.append(nav);

  const total = document.createElement("dd");
  total.id = "summary-total";
  total.textContent = "12 h";
  const compositionSummary = document.createElement("dd");
  compositionSummary.id = "summary-composition";
  compositionSummary.textContent = "4 blocos";
  summary.append(total, compositionSummary);

  const formActions = document.createElement("div");
  const stepMode = document.createElement("label");
  stepMode.className = "step-mode-toggle";
  const generate = document.createElement("button");
  generate.id = "generate-button";
  generate.type = "button";
  const costChip = document.createElement("p");
  costChip.id = "ai-cost-chip";
  formActions.append(stepMode, generate, costChip);
  center.append(formActions);

  const alert = document.createElement("p");
  alert.id = "result-alert";
  alert.className = "hidden";
  document.body.append(intro, form, alert);
  const recovery = document.createElement("div");
  recovery.id = "recovery-dock";
  const recoveryActions = document.createElement("div");
  recoveryActions.className = "recovery-actions";
  ["restore-backup-button", "open-week-button"].forEach((id) => {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    recoveryActions.append(button);
  });
  recovery.append(recoveryActions);
  const draftRecovery = document.createElement("div");
  draftRecovery.id = "draft-recovery";
  draftRecovery.className = "hidden";
  const newProject = document.createElement("a");
  newProject.id = "new-project-link";
  const credits = document.createElement("footer");
  credits.className = "site-footer";
  document.body.append(recovery, draftRecovery, newProject, credits);

  // Geometria previsível: linkedom não faz layout e não há dependência de navegador real.
  const elementPrototype = Object.getPrototypeOf(document.createElement("div"));
  elementPrototype.getBoundingClientRect = () => ({ top: 100, left: 0, right: 400, bottom: 164, width: 400, height: 64, x: 0, y: 100, toJSON() { return this; } });
  elementPrototype.scrollTo = function scrollTo(options) { this.__lastScrollTo = options; };
  elementPrototype.scrollIntoView = function scrollIntoView(options) { this.__lastScrollIntoView = options; };

  return { document, window, center, navigation, summary, workspace, sectors, assistButton, generate, actionIds, alert, weekGrid, intro };
}

function installBrowserStubs(t) {
  const previous = new Map();
  const remember = (key) => previous.set(key, Object.prototype.hasOwnProperty.call(globalThis, key) ? globalThis[key] : undefined);
  const restore = (key) => {
    const value = previous.get(key);
    if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  };
  ["document", "window", "MutationObserver", "ResizeObserver", "requestAnimationFrame"].forEach(remember);
  const env = fixture();
  const frames = [];
  const observed = [];
  class StubMutationObserver {
    constructor(callback) { this.callback = callback; this.targets = []; observed.push(this); }
    observe(target, options) { this.targets.push({ target, options }); }
    disconnect() { this.targets = []; }
  }
  class StubResizeObserver {
    constructor(callback) { this.callback = callback; this.targets = []; }
    observe(target) { this.targets.push(target); }
    disconnect() { this.targets = []; }
  }
  globalThis.document = env.document;
  globalThis.window = env.window;
  globalThis.MutationObserver = StubMutationObserver;
  globalThis.ResizeObserver = StubResizeObserver;
  globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  env.window.innerWidth = 1280;
  env.window.fetch = async () => { env.fetchCalls += 1; return { ok: true }; };
  env.fetchCalls = 0;

  // Linkedom só propaga em bubble. Emular a captura do document antes do alvo
  // permite testar cliques laterais que usam stopImmediatePropagation.
  env.window.__documentClickCapture = [];
  const addDocumentListener = env.document.addEventListener.bind(env.document);
  env.document.addEventListener = (type, listener, options) => {
    if (type === "click" && (options === true || options?.capture)) env.window.__documentClickCapture.push(listener);
    addDocumentListener(type, listener, options);
  };
  initializeStudio();
  while (frames.length) frames.shift()(0);
  env.observed = observed;
  env.flushFrames = () => { while (frames.length) frames.shift()(0); };
  env.cleanup = () => ["document", "window", "MutationObserver", "ResizeObserver", "requestAnimationFrame"].forEach(restore);
  t.after(env.cleanup);
  return env;
}

function click(window, node) {
  for (const listener of window.__documentClickCapture || []) listener({ target: node });
  const event = new window.Event("click", { bubbles: true, cancelable: true });
  node.dispatchEvent(event);
  return event;
}

function dispatch(window, node, type) {
  node.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
}

test("initializeStudio coloca a navegação real na barra superior e preserva os quatro nomes", (t) => {
  const { document, window, workspace, center } = installBrowserStubs(t);
  const journey = document.querySelector(".studio-journey-bar");
  const stageTrack = journey.querySelector(":scope > .studio-stage-track");
  const substeps = stageTrack.querySelector(":scope > #studio-plan-substeps");

  assert.ok(journey);
  assert.equal(journey.parentElement, workspace.parentElement);
  assert.equal(journey.nextElementSibling, workspace);
  assert.deepEqual([...journey.children].map((node) => node.className), ["studio-stage-track"]);
  assert.equal(substeps.parentElement, stageTrack);
  assert.equal(substeps.previousElementSibling, stageTrack.querySelector('[data-studio-stage="plan"]'));
  assert.equal(substeps.nextElementSibling, stageTrack.querySelector('[data-studio-stage="review"]'));
  assert.equal(stageTrack.getAttribute("aria-label"), "Etapas da autoria");
  assert.equal(substeps.getAttribute("aria-label"), "Etapas de Planejar");
  assert.deepEqual([...substeps.querySelectorAll("[data-plan-group] strong")].map((node) => node.textContent), EXPECTED_GROUPS.map(({ label }) => label));
  assert.deepEqual([...document.querySelectorAll("[data-studio-stage] strong")].map((node) => node.textContent), ["Planejar", "Revisar", "Exportar", "Importar"]);
  assert.equal(substeps.classList.contains("studio-hidden"), true);
  assert.equal(substeps.hidden, true);
  assert.equal(document.body.dataset.studioSubstepsOpen, "false");
  assert.equal(stageTrack.querySelector('[data-studio-stage="plan"]').getAttribute("aria-expanded"), "false");
  click(window, stageTrack.querySelector('[data-studio-stage="plan"]'));
  assert.equal(substeps.classList.contains("studio-hidden"), false);
  assert.equal(substeps.hidden, false);
  assert.equal(document.body.dataset.studioSubstepsOpen, "true");
  assert.equal(stageTrack.querySelector('[data-studio-stage="plan"]').getAttribute("aria-expanded"), "true");
  assert.equal(center.querySelector(".studio-plan-progress"), null);
  assert.equal(center.querySelector(".studio-plan-group-track"), null);
  assert.equal(center.querySelector(".studio-stage-track"), null);
  assert.equal(center.querySelector(".journey-step"), null);
});

test("clicks das quatro etapas e dos 13 passos navegam sem iniciar IA", async (t) => {
  const env = installBrowserStubs(t);
  const { document, window } = env;
  let aiActions = 0;
  document.getElementById("assist-button").addEventListener("click", () => { aiActions += 1; });
  document.getElementById("generate-button").addEventListener("click", () => { aiActions += 1; });
  click(window, document.querySelector('[data-studio-stage="plan"]'));
  assert.equal(document.getElementById("studio-plan-substeps").hidden, false);

  for (const group of EXPECTED_GROUPS) {
    const button = document.querySelector(`[data-plan-group="${group.id}"]`);
    click(window, button);
    assert.equal(document.body.dataset.planningStep, group.firstStep, `etapa ${group.label}`);
    assert.equal(button.getAttribute("aria-current"), "step");
  }
  for (const step of EXPECTED_STEPS) {
    const link = document.querySelector(`[data-plan-step="${step}"]`);
    assert.ok(link, `link do passo ${step}`);
    click(window, link);
    assert.equal(document.body.dataset.studioView, "plan");
    assert.equal(document.body.dataset.planningStep, step, `passo ${step}`);
    assert.equal(link.getAttribute("aria-current"), "location");
  }
  assert.equal(env.fetchCalls, 0);
  assert.equal(aiActions, 0);
});

test("a lista vertical só abre por Planejar ou por subetapa e fecha ao clicar fora", (t) => {
  const { document, window } = installBrowserStubs(t);
  const progress = document.getElementById("studio-plan-substeps");
  const planButton = document.querySelector('[data-studio-stage="plan"]');

  assert.equal(progress.hidden, true, "não abre automaticamente ao entrar no workspace");
  click(window, document.querySelector('[data-plan-step="course"]'));
  assert.equal(document.body.dataset.studioView, "plan");
  assert.equal(progress.hidden, true, "um clique num passo lateral não abre a lista das quatro etapas");

  click(window, planButton);
  assert.equal(progress.hidden, false, "o botão Planejar abre a lista vertical");
  click(window, document.querySelector('[data-plan-group="pedagogy"]'));
  assert.equal(document.body.dataset.planningStep, "objectives");
  assert.equal(progress.hidden, false, "selecionar uma das quatro etapas mantém a lista durante a escolha");

  click(window, document.getElementById("studio-task-title"));
  assert.equal(document.body.dataset.studioView, "plan");
  assert.equal(progress.hidden, true, "um clique fora fecha a lista sem alterar a área atual");
  assert.equal(planButton.getAttribute("aria-expanded"), "false");

  click(window, document.querySelector('[data-studio-stage="review"]'));
  click(window, document.querySelector('[data-studio-stage="export"]'));
  assert.equal(document.body.dataset.studioView, "export");
  assert.equal(progress.hidden, true, "cliques em outras áreas não abrem as subetapas");
});

test("cliques laterais, campos e espaço livre da barra fecham sem reabrir o menu", (t) => {
  const { document, window, observed, flushFrames } = installBrowserStubs(t);
  const progress = document.getElementById("studio-plan-substeps");
  const planButton = document.querySelector('[data-studio-stage="plan"]');
  const results = document.getElementById("results-section");
  const observer = observed.find((item) => item.targets.some(({ target }) => target === results));
  for (const target of [
    document.querySelector('[data-plan-step="objectives"]'),
    document.getElementById("objectives"),
    document.getElementById("studio-step-status"),
    document.getElementById("studio-all-sectors"),
    document.getElementById("studio-next"),
    document.querySelector(".site-footer")
  ]) {
    click(window, planButton);
    assert.equal(progress.hidden, false);
    click(window, target);
    assert.equal(progress.hidden, true, `clique fora em ${target.id || target.dataset.planStep || target.className}`);
    assert.equal(planButton.getAttribute("aria-expanded"), "false");
    observer.callback([{ target: document.getElementById("result-alert"), type: "childList" }]);
    flushFrames();
    assert.equal(progress.hidden, true, "atualização posterior não reabre");
  }
});

test("clicar novamente em Planejar fecha a lista sem sair do passo atual", (t) => {
  const { document, window } = installBrowserStubs(t);
  const progress = document.getElementById("studio-plan-substeps");
  const planButton = document.querySelector('[data-studio-stage="plan"]');
  click(window, planButton);
  click(window, document.querySelector('[data-plan-group="materials"]'));
  assert.equal(progress.hidden, false);
  click(window, planButton);
  assert.equal(progress.hidden, true);
  assert.equal(document.body.dataset.studioView, "plan");
  assert.equal(document.body.dataset.planningStep, "resources");
});

test("Revisar, Exportar e Importar ocultam subetapas; voltar a Planejar conserva o passo atual", (t) => {
  const { document, window } = installBrowserStubs(t);
  const progress = document.getElementById("studio-plan-substeps");
  const toolbar = document.querySelector(".studio-plan-toolbar");
  const reviewTools = document.querySelector(".studio-review-tools");
  const exportTools = document.querySelector(".studio-export-tools");
  const importTools = document.querySelector(".studio-import-tools");
  const stepLink = document.querySelector('[data-plan-step="support"]');
  click(window, stepLink);
  assert.equal(document.body.dataset.planningStep, "support");

  click(window, document.querySelector('[data-studio-stage="review"]'));
  assert.equal(document.body.dataset.studioView, "review");
  assert.ok(progress.classList.contains("studio-hidden"));
  assert.equal(progress.hidden, true);
  assert.equal(document.querySelector('[data-studio-stage="plan"]').getAttribute("aria-expanded"), "false");
  assert.ok(toolbar.classList.contains("studio-hidden"));
  assert.ok(reviewTools && !reviewTools.classList.contains("studio-hidden"));
  click(window, document.querySelector('[data-studio-stage="export"]'));
  assert.equal(document.body.dataset.studioView, "export");
  assert.ok(progress.classList.contains("studio-hidden"));
  assert.ok(exportTools && !exportTools.classList.contains("studio-hidden"));

  click(window, document.querySelector('[data-studio-stage="import"]'));
  assert.equal(document.body.dataset.studioView, "import");
  assert.ok(progress.classList.contains("studio-hidden"));
  assert.ok(importTools && !importTools.classList.contains("studio-hidden"));
  assert.equal(document.getElementById("restore-backup-button").closest(".studio-import-tools"), importTools);
  assert.equal(document.getElementById("open-week-button").closest(".studio-import-tools"), importTools);

  click(window, document.querySelector('[data-studio-stage="plan"]'));
  assert.equal(document.body.dataset.studioView, "plan");
  assert.equal(document.body.dataset.planningStep, "support");
  assert.ok(!progress.classList.contains("studio-hidden"));
  assert.equal(progress.hidden, false);
  assert.equal(document.querySelector('[data-studio-stage="plan"]').getAttribute("aria-expanded"), "true");
  assert.ok(!toolbar.classList.contains("studio-hidden"));
  assert.equal(document.querySelector('[data-plan-step="support"]').getAttribute("aria-current"), "location");
});

test("Exportar não reabre Planejar quando os resultados e os avisos são atualizados", (t) => {
  const env = installBrowserStubs(t);
  const { document, window, weekGrid, observed, flushFrames } = env;
  const results = document.getElementById("results-section");
  const progress = document.getElementById("studio-plan-substeps");
  const resultObserver = observed.find((observer) => observer.targets.some(({ target }) => target === results));
  results.classList.remove("hidden");
  document.getElementById("general-plan").classList.remove("hidden");
  const week = document.createElement("article");
  week.className = "week-card";
  weekGrid.append(week);
  resultObserver.callback([{ target: results, attributeName: "class" }]);
  flushFrames();
  assert.equal(document.body.dataset.studioView, "review", "a primeira geração ainda avança de Planejar para Revisar");

  click(window, document.querySelector('[data-studio-stage="plan"]'));
  assert.equal(progress.hidden, false);
  click(window, document.querySelector('[data-studio-stage="review"]'));
  assert.equal(progress.hidden, true);
  click(window, document.querySelector('[data-studio-stage="export"]'));
  for (const records of [
    [{ target: results, attributeName: "class" }],
    [{ target: weekGrid, type: "childList" }],
    [{ target: document.getElementById("result-alert"), type: "childList" }]
  ]) {
    resultObserver.callback(records);
    flushFrames();
    assert.equal(document.body.dataset.studioView, "export");
    assert.equal(progress.hidden, true);
    assert.ok(progress.classList.contains("studio-hidden"));
    assert.equal(document.querySelector('[data-studio-stage="export"]').getAttribute("aria-current"), "step");
  }
  click(window, document.querySelector('[data-studio-stage="import"]'));
  assert.ok(results.classList.contains("studio-hidden"));
  assert.equal(progress.hidden, true);
  for (const view of ["export", "import"]) {
    click(window, document.querySelector(`[data-studio-stage="${view}"]`));
    for (const hidden of [true, false, true, false]) {
      results.classList.toggle("hidden", hidden);
      resultObserver.callback([{ target: results, attributeName: "class" }]);
      flushFrames();
      assert.equal(document.body.dataset.studioView, view, `${view} permanece selecionado quando os resultados ${hidden ? "desaparecem" : "surgem"}`);
      assert.equal(progress.hidden, true);
      assert.ok(progress.classList.contains("studio-hidden"));
      assert.equal(document.querySelector('[data-studio-stage="plan"]').getAttribute("aria-expanded"), "false");
    }
  }
});

test("briefing completo continua acessível na coluna central e pode voltar ao foco do passo", (t) => {
  const { document, window, center, sectors } = installBrowserStubs(t);
  const toggle = document.getElementById("studio-all-sectors");
  const startingStep = document.body.dataset.planningStep;
  click(window, toggle);

  assert.equal(toggle.textContent, "Voltar ao foco por passo");
  assert.equal(document.getElementById("studio-task-title").textContent, "Seu briefing completo.");
  assert.ok(document.body.classList.contains("studio-all-sectors"));
  assert.equal(center.querySelectorAll(":scope > .briefing-sector").length, 7);
  sectors.forEach((sector) => {
    assert.equal(sector.open, true);
    assert.ok(!sector.classList.contains("studio-hidden"));
  });
  assert.ok([...center.querySelectorAll(".studio-planning-chunk")].every((chunk) => !chunk.classList.contains("studio-hidden")));
  assert.ok(center.querySelector("#course-title"));
  assert.ok(center.querySelector("#objectives"));

  click(window, toggle);
  assert.equal(document.body.dataset.planningStep, startingStep);
  assert.ok(!document.body.classList.contains("studio-all-sectors"));
  assert.equal(toggle.textContent, "Ver briefing completo");
});

test("IDs, elementos originais e handlers sobrevivem ao reposicionamento dos controles", (t) => {
  const env = fixture();
  const { document, window } = env;
  const originalNodes = [...document.querySelectorAll("[id]")];
  const originalIds = originalNodes.map((node) => node.id).sort();
  const originalResultLinks = [...document.querySelectorAll("#project-navigation [data-scroll-to]")].slice(7);
  const nodes = {
    assist: document.getElementById("assist-button"),
    title: document.getElementById("course-title"),
    generate: document.getElementById("generate-button"),
    export: document.getElementById("zip-button"),
    restore: document.getElementById("restore-backup-button"),
    openWeek: document.getElementById("open-week-button")
  };
  const events = { assist: 0, input: 0, generate: 0, export: 0, restore: 0, openWeek: 0 };
  nodes.assist.addEventListener("click", () => { events.assist += 1; });
  nodes.title.addEventListener("input", () => { events.input += 1; });
  nodes.generate.addEventListener("click", () => { events.generate += 1; });
  nodes.export.addEventListener("click", () => { events.export += 1; });
  nodes.restore.addEventListener("click", () => { events.restore += 1; });
  nodes.openWeek.addEventListener("click", () => { events.openWeek += 1; });
  // Reutiliza o DOM acima no setup de browser: evita recriar ou substituir os nós sob teste.
  const previous = new Map(["document", "window", "MutationObserver", "ResizeObserver", "requestAnimationFrame"].map((key) => [key, Object.prototype.hasOwnProperty.call(globalThis, key) ? globalThis[key] : undefined]));
  const frames = [];
  class StubMutationObserver { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} }
  class StubResizeObserver { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} }
  globalThis.document = document;
  globalThis.window = window;
  globalThis.MutationObserver = StubMutationObserver;
  globalThis.ResizeObserver = StubResizeObserver;
  globalThis.requestAnimationFrame = (callback) => { frames.push(callback); };
  window.innerWidth = 1280;
  initializeStudio();
  while (frames.length) frames.shift()(0);
  t.after(() => {
    for (const [key, value] of previous) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  });
  const idsAfter = [...document.querySelectorAll("[id]")].map((node) => node.id);
  assert.equal(idsAfter.length, new Set(idsAfter).size, "não há IDs duplicados após inicializar");
  originalNodes.forEach((node) => {
    assert.ok(node.isConnected, `#${node.id} continua conectado`);
    assert.equal(document.getElementById(node.id), node, `#${node.id} mantém a mesma instância`);
  });
  assert.deepEqual(originalIds, originalNodes.map((node) => node.id).sort());
  assert.deepEqual(originalResultLinks.map((link) => link.dataset.scrollTo), RESULT_LINKS.map(([id]) => id));
  originalResultLinks.forEach((link, index) => assert.equal(document.querySelector(`#project-navigation [data-scroll-to="${RESULT_LINKS[index][0]}"]`), link));
  assert.equal(nodes.assist.closest(".studio-assist-row") != null, true);
  assert.equal(nodes.generate.closest(".studio-generation-area") != null, true);
  assert.equal(nodes.export.closest(".studio-export-tools") != null, true);
  assert.equal(nodes.restore.closest(".studio-import-tools") != null, true);
  assert.equal(nodes.openWeek.closest(".studio-import-tools") != null, true);

  click(window, nodes.assist);
  dispatch(window, nodes.title, "input");
  click(window, nodes.generate);
  click(window, nodes.export);
  click(window, nodes.restore);
  click(window, nodes.openWeek);
  assert.deepEqual(events, { assist: 1, input: 1, generate: 1, export: 1, restore: 1, openWeek: 1 });
});
