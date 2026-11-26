import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseHTML } from "linkedom";
import { initializeStudio } from "../public/studio-ui.js";

const EXPECTED_GROUPS = [
  ["course", "O curso"],
  ["pedagogy", "Escolhas pedagógicas"],
  ["materials", "Materiais da aula"],
  ["check", "Conferir e gerar"]
];
const BASE_HTML = new URL("../public/index.html", import.meta.url);
const APP_JS = new URL("../public/app.js", import.meta.url);

function promotePanelsToSectors(document) {
  const center = document.querySelector(".form-column");
  const panels = [...center.querySelectorAll(":scope > .panel")];
  assert.equal(panels.length, 7, "o formulário mantém seus sete painéis de briefing");

  panels.forEach((panel, index) => {
    const heading = panel.querySelector(":scope > .panel-heading");
    const sector = document.createElement("details");
    sector.className = `${panel.className} briefing-sector`;
    sector.id = `sector-${String(index + 1).padStart(2, "0")}`;
    sector.open = index === 0;

    const summary = document.createElement("summary");
    summary.className = "sector-summary";
    while (heading.firstChild) summary.append(heading.firstChild);
    const body = document.createElement("div");
    body.className = "sector-body";
    [...panel.children].filter((child) => child !== heading).forEach((child) => body.append(child));
    sector.append(summary, body);
    panel.replaceWith(sector);
  });
  return [...center.querySelectorAll(":scope > .briefing-sector")];
}

function simulateEnhanceLayout(document, sectors) {
  const workspace = document.querySelector(".workspace-grid");
  const summary = document.querySelector(".summary-column");
  const actions = document.createElement("section");
  actions.className = "sidebar-actions";
  actions.innerHTML = '<p class="sidebar-label">AÇÕES DO PROJETO</p>';
  [
    "assist-button", "generate-button", "recalculate-button", "alignment-map-button",
    "rubrics-button", "style-button", "ficha-button", "production-sheet-button",
    "teacher-pdf-button", "zip-button"
  ].forEach((id) => {
    const node = document.getElementById(id);
    if (node) actions.append(node);
  });
  summary.querySelector(".summary-card").after(actions);
  document.querySelectorAll(".form-actions, .results-actions").forEach((node) => node.remove());

  const navigationColumn = document.createElement("aside");
  navigationColumn.className = "navigation-column";
  const navigation = document.createElement("nav");
  navigation.id = "project-navigation";
  for (const sector of sectors) {
    const link = document.createElement("a");
    link.href = `#${sector.id}`;
    link.dataset.scrollTo = sector.id;
    link.textContent = sector.id;
    navigation.append(link);
  }
  for (const [id, label] of [
    ["results-load", "Carga por atividade"],
    ["results-review", "Checklists"],
    ["results-weeks", "Semanas planejadas"],
    ["results-production", "Produção audiovisual"]
  ]) {
    const link = document.createElement("a");
    link.href = `#${id}`;
    link.dataset.scrollTo = id;
    link.textContent = `${label} →`;
    navigation.append(link);
  }
  navigationColumn.append(navigation);
  workspace.insertBefore(navigationColumn, summary);
}

async function makeFixture() {
  const html = await readFile(BASE_HTML, "utf8");
  const { document, window } = parseHTML(html);
  const sectors = promotePanelsToSectors(document);
  simulateEnhanceLayout(document, sectors);
  return { document, window };
}

async function initializeFixture(t, fixture = null) {
  const { document, window } = fixture || await makeFixture();
  const keys = ["document", "window", "MutationObserver", "ResizeObserver", "requestAnimationFrame"];
  const previous = new Map(keys.map((key) => [key, {
    hadOwn: Object.prototype.hasOwnProperty.call(globalThis, key),
    value: globalThis[key]
  }]));
  const frames = [];
  class StubMutationObserver {
    constructor(callback) { this.callback = callback; }
    observe() {}
    disconnect() {}
  }
  class StubResizeObserver {
    constructor(callback) { this.callback = callback; }
    observe() {}
    disconnect() {}
  }
  globalThis.document = document;
  globalThis.window = window;
  globalThis.MutationObserver = StubMutationObserver;
  globalThis.ResizeObserver = StubResizeObserver;
  globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  window.innerWidth = 1280;
  initializeStudio();
  while (frames.length) frames.shift()(0);

  t.after(() => {
    for (const [key, entry] of previous) {
      if (entry.hadOwn) globalThis[key] = entry.value;
      else delete globalThis[key];
    }
  });
  return { document, window };
}

function click(window, node) {
  node.dispatchEvent(new window.Event("click", { bubbles: true, cancelable: true }));
}

test("initializeStudio exibe os quatro nomes das etapas em texto forte", async (t) => {
  const { document } = await initializeFixture(t);
  const groups = [...document.querySelectorAll(".studio-plan-progress [data-plan-group]")];

  assert.deepEqual(groups.map((button) => [button.dataset.planGroup, button.querySelector("strong")?.textContent]), EXPECTED_GROUPS);
  assert.ok(groups.every((button) => button.querySelector("strong")?.textContent.trim()), "cada etapa tem rótulo textual visível, além de qualquer número ou ícone");
});

test("Revisar e Exportar movem os nós originais e preservam IDs e listeners", async (t) => {
  const fixture = await makeFixture();
  const { document } = fixture;
  const ids = ["alignment-map-button", "rubrics-button", "ficha-button"];
  const originalNodes = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const events = Object.fromEntries(ids.map((id) => [id, 0]));
  ids.forEach((id) => originalNodes[id].addEventListener("click", () => { events[id] += 1; }));
  const initialized = await initializeFixture(t, fixture);

  // Os listeners anexados antes da mutação confirmam que os nós não foram recriados.
  assert.ok(document.querySelector(".studio-review-tools #alignment-map-button"));
  assert.ok(document.querySelector(".studio-review-tools #rubrics-button"));
  assert.ok(document.querySelector(".studio-export-tools #ficha-button"));
  ids.forEach((id) => {
    assert.equal(document.getElementById(id), originalNodes[id]);
    assert.equal(originalNodes[id].id, id);
    click(initialized.window, originalNodes[id]);
  });
  assert.deepEqual(events, { "alignment-map-button": 1, "rubrics-button": 1, "ficha-button": 1 });
});

test("assist-button permanece no passo objectives e a navegação não aciona a IA", async (t) => {
  const fixture = await makeFixture();
  const { document } = fixture;
  const assist = document.getElementById("assist-button");
  const generate = document.getElementById("generate-button");
  let aiClicks = 0;
  assist.addEventListener("click", () => { aiClicks += 1; });
  generate.addEventListener("click", () => { aiClicks += 1; });
  const initialized = await initializeFixture(t, fixture);
  const { window } = initialized;

  assert.equal(document.querySelector('[data-planning-step="objectives"] #assist-button'), assist);
  assert.equal(assist.id, "assist-button");
  click(window, document.querySelector('[data-plan-group="pedagogy"]'));
  assert.equal(document.body.dataset.planningStep, "objectives");
  click(window, document.querySelector('#project-navigation [data-plan-step="objectives"]'));
  assert.equal(document.body.dataset.planningStep, "objectives");
  click(window, document.querySelector('[data-studio-stage="review"]'));
  click(window, document.querySelector('[data-studio-stage="export"]'));
  click(window, document.querySelector('[data-studio-stage="plan"]'));

  assert.equal(aiClicks, 0, "navegar entre etapas e passos não dispara botões de IA");
});

test("o HTML mantém os rótulos esperados e app.js não substitui o rótulo do assistente por status", async () => {
  const [html, app] = await Promise.all([readFile(BASE_HTML, "utf8"), readFile(APP_JS, "utf8")]);
  const { document } = parseHTML(html);
  assert.equal(document.querySelector("#ficha-button")?.textContent.trim(), "Plano de Ensino");
  assert.equal(document.querySelector("#assist-button .button-label")?.textContent.trim(), "Preencher vazios com IA");

  const assistLabelWrites = [...app.matchAll(/setButtonLabel\(\s*\$\(\s*["']#assist-button["']\s*\)\s*,\s*["']([^"']+)["']\s*\)/g)];
  assert.ok(assistLabelWrites.every((match) => match[1] === "Preencher vazios com IA"), "o código não renomeia o botão para um status de disponibilidade da IA");
  assert.match(app, /\$\("#assist-button"\)\.addEventListener\("click",\s*assistBriefing\)/);
  assert.match(app, /\$\("#alignment-map-button"\)\?\.addEventListener\("click",\s*openAlignmentMap\)/);
  assert.match(app, /\$\("#rubrics-button"\)\?\.addEventListener\("click",\s*openRubrics\)/);
  assert.match(app, /\$\("#ficha-button"\)\?\.addEventListener\("click",\s*openFicha\)/);
});
