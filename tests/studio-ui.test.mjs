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
  const folderBar = document.createElement("section");
  folderBar.id = "project-folder-bar";
  ["project-folder-choose", "project-folder-reconnect", "project-folder-open", "project-folder-forget"].forEach((id) => {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    folderBar.append(button);
  });
  const recoveryBar = document.createElement("section");
  recoveryBar.id = "recovery-bar";
  ["save-backup-button", "restore-backup-button", "open-week-button"].forEach((id) => {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    recoveryBar.append(button);
  });
  ["backup-file-input", "week-file-input"].forEach((id) => {
    const input = document.createElement("input");
    input.id = id;
    input.type = "file";
    recoveryBar.append(input);
  });
  const draftRecovery = document.createElement("div");
  draftRecovery.id = "draft-recovery";
  draftRecovery.className = "hidden";
  const restoreDraft = document.createElement("button");
  restoreDraft.id = "restore-draft-button";
  restoreDraft.type = "button";
  const discardDraft = document.createElement("button");
  discardDraft.id = "discard-draft-button";
  discardDraft.type = "button";
  draftRecovery.append(restoreDraft, discardDraft);
  recovery.append(folderBar, recoveryBar, draftRecovery);
  const newProject = document.createElement("a");
  newProject.id = "new-project-link";
  const credits = document.createElement("footer");
  credits.className = "site-footer";
  credits.innerHTML = '<div class="studio-footer-institution"><img alt="IFSC" /><span><strong>Instituto Federal de Santa Catarina</strong><small>Câmpus Florianópolis–Continente</small></span></div><div class="studio-footer-credit"><span>Desenvolvido por <strong>Prof. Rogério Bittencourt</strong></span><small>INOVALAB · Laboratório de Inovação e Tecnologia Educacional</small></div><div class="studio-footer-signature"><img alt="INOVALAB" /><span>ClassAuthor <em class="semver">v1.22.0</em><small>Compatível com ClassAtelier</small></span></div>';
  document.body.append(recovery, newProject, credits);

  // Geometria previsível: linkedom não faz layout e não há dependência de navegador real.
  const elementPrototype = Object.getPrototypeOf(document.createElement("div"));
  elementPrototype.getBoundingClientRect = function getBoundingClientRect() { const height = this.classList?.contains("site-footer") ? 58 : 64; return { top: 100, left: 0, right: 400, bottom: 100 + height, width: 400, height, x: 0, y: 100, toJSON() { return this; } }; };
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
  const resizeObserved = [];
  class StubMutationObserver {
    constructor(callback) { this.callback = callback; this.targets = []; observed.push(this); }
    observe(target, options) { this.targets.push({ target, options }); }
    disconnect() { this.targets = []; }
  }
  class StubResizeObserver {
    constructor(callback) { this.callback = callback; this.targets = []; resizeObserved.push(this); }
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

  initializeStudio();
  while (frames.length) frames.shift()(0);
  env.observed = observed;
  env.resizeObserved = resizeObserved;
  env.cleanup = () => ["document", "window", "MutationObserver", "ResizeObserver", "requestAnimationFrame"].forEach(restore);
  t.after(env.cleanup);
  return env;
}

function click(window, node) {
  const event = new window.Event("click", { bubbles: true, cancelable: true });
  node.dispatchEvent(event);
  return event;
}

function dispatch(window, node, type) {
  node.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
}

test("initializeStudio coloca a navegação real na barra superior e preserva os quatro nomes", (t) => {
  const { document, workspace, center } = installBrowserStubs(t);
  const journey = document.querySelector(".studio-journey-bar");
  const stageTrack = journey.querySelector(":scope > .studio-stage-track");
  const substeps = stageTrack.querySelector(":scope > #studio-plan-substeps");

  assert.ok(journey);
  assert.equal(journey.parentElement, workspace.parentElement);
  assert.equal(journey.nextElementSibling, workspace);
  assert.deepEqual([...journey.children].map((node) => node.className), ["studio-stage-track"], "não existe uma segunda faixa de navegação");
  assert.equal(substeps.parentElement, stageTrack, "as subetapas de Planejar ficam inline na faixa top-level");
  assert.equal(stageTrack.getAttribute("aria-label"), "Etapas da autoria");
  assert.equal(substeps.getAttribute("aria-label"), "Etapas de Planejar");
  assert.equal(substeps.getAttribute("role"), "group");
  assert.deepEqual([...substeps.querySelectorAll("[data-plan-group]")].map((button) => button.title.split(" · ")[0]), EXPECTED_GROUPS.map(({ label }) => label));
  EXPECTED_GROUPS.forEach(({ label }, index) => {
    const button = substeps.querySelectorAll("[data-plan-group]")[index];
    assert.ok(button.getAttribute("aria-label").startsWith(`${label} ·`), `aria-label completo: ${label}`);
    assert.ok(button.title.startsWith(`${label} ·`), `title completo: ${label}`);
  });
  assert.deepEqual([...document.querySelectorAll("[data-studio-stage] strong")].map((node) => node.textContent), ["Planejar", "Revisar", "Exportar", "Importar"]);
  assert.equal(stageTrack.querySelectorAll("[data-studio-stage]").length, 4, "os quatro estágios dividem a mesma faixa superior");
  assert.equal(journey.querySelectorAll(":scope > .studio-stage-track").length, 1, "Importar não cria uma segunda faixa");
  assert.ok(!substeps.classList.contains("studio-hidden"), "os quatro marcadores são visíveis em Planejar");
  assert.equal(center.querySelector(".studio-plan-progress"), null);
  assert.equal(center.querySelector(".studio-plan-group-track"), null);
  assert.equal(center.querySelector(".studio-stage-track"), null);
  assert.equal(center.querySelector(".journey-step"), null);
});

test("créditos permanecem completos e o rodapé continua usando altura dinâmica", (t) => {
  const { document, resizeObserved } = installBrowserStubs(t);
  const credits = document.querySelector(".site-footer");
  const text = credits.textContent;
  assert.match(text, /Instituto Federal de Santa Catarina/);
  assert.match(text, /Prof\. Rogério Bittencourt/);
  assert.match(text, /INOVALAB/);
  assert.match(text, /v1\.22\.0/);
  assert.ok(resizeObserved.some((observer) => observer.targets.includes(credits)), "ResizeObserver mede o rodapé real");
  assert.equal(document.documentElement.style.getPropertyValue("--studio-footer-height"), "58px", "o espaço reservado usa a altura efetivamente medida");
});

test("clicks dos quatro estágios, grupos e 13 passos navegam sem iniciar IA", async (t) => {
  const env = installBrowserStubs(t);
  const { document, window } = env;
  let aiActions = 0;
  document.getElementById("assist-button").addEventListener("click", () => { aiActions += 1; });
  document.getElementById("generate-button").addEventListener("click", () => { aiActions += 1; });

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
  for (const stage of ["plan", "review", "export", "import"]) {
    const button = document.querySelector(`[data-studio-stage="${stage}"]`);
    click(window, button);
    assert.equal(document.body.dataset.studioView, stage, `estágio ${stage}`);
    assert.equal(button.getAttribute("aria-current"), "step");
  }
  assert.equal(env.fetchCalls, 0);
  assert.equal(aiActions, 0);
});

test("Importar tem vista própria, reusa controles originais e não mostra áreas ou vazios de outras etapas", (t) => {
  const { document, window } = installBrowserStubs(t);
  const importView = document.getElementById("studio-import-view");
  const storage = document.querySelector(".studio-storage");
  const dock = document.getElementById("recovery-dock");
  const styleButton = document.getElementById("style-button");
  const progress = document.getElementById("studio-plan-substeps");
  const toolbar = document.querySelector(".studio-plan-toolbar");
  const reviewTools = document.querySelector(".studio-review-tools");
  const exportTools = document.querySelector(".studio-export-tools");
  const results = document.getElementById("results-section");
  const empty = document.querySelector(".studio-empty-view");

  assert.ok(importView);
  assert.equal(storage.parentElement, importView);
  assert.equal(dock.parentElement, storage);
  assert.equal(styleButton.closest(".studio-import-style")?.parentElement, importView);
  assert.equal(document.querySelector(".navigation-column .studio-storage"), null, "Arquivos e recuperação saiu do rodapé da navegação");
  assert.equal(document.querySelector(".navigation-column .studio-nav-footer"), null, "Meu estilo de escrita saiu do rodapé da navegação");
  assert.equal(document.querySelectorAll("#recovery-dock").length, 1);
  assert.equal(document.querySelectorAll("#style-button").length, 1);

  click(window, document.querySelector('[data-studio-stage="import"]'));
  assert.equal(document.body.dataset.studioView, "import");
  assert.equal(document.getElementById("studio-task-title").textContent, "Traga seu trabalho para cá.");
  assert.ok(!importView.classList.contains("studio-hidden"));
  assert.ok(progress.classList.contains("studio-hidden"), "marcadores de Planejar não aparecem em Importar");
  [progress, toolbar, reviewTools, exportTools, results, empty].forEach((node) => assert.ok(node.classList.contains("studio-hidden"), `${node.className || node.id} deve ficar oculto em Importar`));

  const weekCard = document.createElement("article");
  weekCard.className = "week-card";
  document.getElementById("week-grid").append(weekCard);
  results.classList.remove("hidden");
  click(window, document.querySelector('[data-studio-stage="import"]'));
  assert.ok(results.classList.contains("studio-hidden"), "a vista de resultados continua oculta em Importar");
  assert.ok(empty.classList.contains("studio-hidden"), "Importar não mostra o estado vazio de Revisar/Exportar mesmo com resultados existentes");

  click(window, document.querySelector('[data-studio-stage="plan"]'));
  assert.equal(document.body.dataset.studioView, "plan", "a navegação de volta a Planejar continua funcionando");
  assert.ok(importView.classList.contains("studio-hidden"));
});

test("Revisar e Exportar ocultam subetapas; voltar a Planejar conserva o passo atual", (t) => {
  const { document, window } = installBrowserStubs(t);
  const progress = document.getElementById("studio-plan-substeps");
  const toolbar = document.querySelector(".studio-plan-toolbar");
  const reviewTools = document.querySelector(".studio-review-tools");
  const exportTools = document.querySelector(".studio-export-tools");
  const stepLink = document.querySelector('[data-plan-step="support"]');
  click(window, stepLink);
  assert.equal(document.body.dataset.planningStep, "support");

  click(window, document.querySelector('[data-studio-stage="review"]'));
  assert.equal(document.body.dataset.studioView, "review");
  assert.ok(progress.classList.contains("studio-hidden"));
  assert.ok(toolbar.classList.contains("studio-hidden"));
  assert.ok(reviewTools && !reviewTools.classList.contains("studio-hidden"));
  click(window, document.querySelector('[data-studio-stage="export"]'));
  assert.equal(document.body.dataset.studioView, "export");
  assert.ok(progress.classList.contains("studio-hidden"));
  assert.ok(exportTools && !exportTools.classList.contains("studio-hidden"));

  click(window, document.getElementById("studio-return-plan"));
  assert.equal(document.body.dataset.studioView, "plan");
  assert.equal(document.body.dataset.planningStep, "support");
  assert.ok(!progress.classList.contains("studio-hidden"));
  assert.ok(!toolbar.classList.contains("studio-hidden"));
  assert.equal(document.querySelector('[data-plan-step="support"]').getAttribute("aria-current"), "location");
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
    backup: document.getElementById("save-backup-button"),
    restoreBackup: document.getElementById("restore-backup-button"),
    openWeek: document.getElementById("open-week-button"),
    backupFile: document.getElementById("backup-file-input"),
    weekFile: document.getElementById("week-file-input"),
    chooseFolder: document.getElementById("project-folder-choose"),
    reconnectFolder: document.getElementById("project-folder-reconnect"),
    openFolder: document.getElementById("project-folder-open"),
    restoreDraft: document.getElementById("restore-draft-button"),
    discardDraft: document.getElementById("discard-draft-button"),
    style: document.getElementById("style-button")
  };
  const events = { assist: 0, input: 0, generate: 0, export: 0, backup: 0, restoreBackup: 0, openWeek: 0, backupFile: 0, weekFile: 0, chooseFolder: 0, reconnectFolder: 0, openFolder: 0, restoreDraft: 0, discardDraft: 0, style: 0 };
  nodes.assist.addEventListener("click", () => { events.assist += 1; });
  nodes.title.addEventListener("input", () => { events.input += 1; });
  nodes.generate.addEventListener("click", () => { events.generate += 1; });
  nodes.export.addEventListener("click", () => { events.export += 1; });
  nodes.backup.addEventListener("click", () => { events.backup += 1; });
  nodes.restoreBackup.addEventListener("click", () => { events.restoreBackup += 1; });
  nodes.openWeek.addEventListener("click", () => { events.openWeek += 1; });
  nodes.backupFile.addEventListener("change", () => { events.backupFile += 1; });
  nodes.weekFile.addEventListener("change", () => { events.weekFile += 1; });
  nodes.chooseFolder.addEventListener("click", () => { events.chooseFolder += 1; });
  nodes.reconnectFolder.addEventListener("click", () => { events.reconnectFolder += 1; });
  nodes.openFolder.addEventListener("click", () => { events.openFolder += 1; });
  nodes.restoreDraft.addEventListener("click", () => { events.restoreDraft += 1; });
  nodes.discardDraft.addEventListener("click", () => { events.discardDraft += 1; });
  nodes.style.addEventListener("click", () => { events.style += 1; });
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
  assert.equal(nodes.backup.closest("#recovery-dock"), document.getElementById("recovery-dock"));
  assert.equal(nodes.style.closest(".studio-import-view") != null, true);
  assert.equal(document.querySelectorAll("#project-folder-choose, #project-folder-reconnect, #project-folder-open, #project-folder-forget, #save-backup-button, #restore-backup-button, #open-week-button, #restore-draft-button, #discard-draft-button, #backup-file-input, #week-file-input").length, 11);

  click(window, nodes.assist);
  dispatch(window, nodes.title, "input");
  click(window, nodes.generate);
  click(window, nodes.export);
  click(window, nodes.backup);
  click(window, nodes.restoreBackup);
  click(window, nodes.openWeek);
  dispatch(window, nodes.backupFile, "change");
  dispatch(window, nodes.weekFile, "change");
  click(window, nodes.chooseFolder);
  click(window, nodes.reconnectFolder);
  click(window, nodes.openFolder);
  click(window, nodes.restoreDraft);
  click(window, nodes.discardDraft);
  click(window, nodes.style);
  assert.deepEqual(events, { assist: 1, input: 1, generate: 1, export: 1, backup: 1, restoreBackup: 1, openWeek: 1, backupFile: 1, weekFile: 1, chooseFolder: 1, reconnectFolder: 1, openFolder: 1, restoreDraft: 1, discardDraft: 1, style: 1 });
});
