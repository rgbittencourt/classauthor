import { PLAN_GROUPS, PLAN_STEPS, partitionPlanningSectors, planningStepForField } from "./studio-planning.js?v=20261126-planning-steps";

// A apresentação muda; os controles e renderizadores do ClassAuthor continuam donos dos dados.
export function initializeStudio() {
  const $ = (selector) => document.querySelector(selector);
  const center = $(".form-column");
  const navigation = $(".navigation-column");
  const summary = $(".summary-column");
  const results = $("#results-section");
  if (!center || !navigation || !summary || !results) return;
  const sectors = [...center.querySelectorAll(":scope > .briefing-sector")];
  if (sectors.length !== 7) return;
  let activeStep = 0;
  let view = "plan";
  let planMenuOpen = false;
  let allSectors = false;
  let hadResults = false;

  const journey = document.createElement("div");
  journey.className = "studio-journey-bar";
  journey.innerHTML = `<nav class="studio-stage-track" aria-label="Etapas da autoria"><button type="button" class="studio-stage" data-studio-stage="plan" aria-controls="studio-plan-substeps"><span class="stage-number">01</span><span><strong>Planejar</strong><small>4 etapas · 13 passos</small></span></button><button type="button" class="studio-stage" data-studio-stage="review"><span class="stage-number">02</span><span><strong>Revisar</strong><small>Aulas · alinhamento · rubricas</small></span></button><button type="button" class="studio-stage" data-studio-stage="export"><span class="stage-number">03</span><span><strong>Exportar</strong><small>Plano de Ensino · materiais</small></span></button><button type="button" class="studio-stage" data-studio-stage="import" aria-controls="studio-import-tools"><span class="stage-number">04</span><span><strong>Importar</strong><small>Backups · aulas salvas</small></span></button><span class="studio-step-status" id="studio-step-status"></span></nav>`;
  $(".workspace-grid").before(journey);

  const intro = $(".intro");
  intro.innerHTML = `<div class="studio-task-meta"><p class="eyebrow">ESTÚDIO DE AUTORIA</p><span id="studio-sector-position"></span></div><h1 id="studio-task-title" tabindex="-1"></h1><p class="intro-copy" id="studio-task-description"></p>`;
  const planProgress = document.createElement("nav");
  planProgress.className = "studio-plan-progress";
  planProgress.id = "studio-plan-substeps";
  planProgress.setAttribute("aria-label", "Etapas de Planejar");
  planProgress.innerHTML = `<div class="studio-plan-parent"><span>DENTRO DE PLANEJAR</span><small id="studio-plan-position" aria-live="polite"></small></div><ol class="studio-plan-group-track">${PLAN_GROUPS.map((group, index) => {
    const positions = PLAN_STEPS.map((step, stepIndex) => step.group === group.id ? stepIndex + 1 : null).filter(Boolean);
    const range = positions.length === 1 ? `Passo ${String(positions[0]).padStart(2, "0")}` : `Passos ${String(positions[0]).padStart(2, "0")}–${String(positions.at(-1)).padStart(2, "0")}`;
    const hint = group.id === "pedagogy" ? "<small class=\"studio-plan-group-hint\">Inclui IA nos objetivos</small>" : "";
    return `<li><button type="button" data-plan-group="${group.id}" aria-label="${group.label}. ${range}${group.id === "pedagogy" ? ". Inclui preenchimento assistido por IA nos objetivos" : ""}."><span class="studio-plan-marker" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span class="studio-plan-group-copy"><strong>${group.label}</strong><small>${range}</small>${hint}</span></button></li>`;
  }).join("")}</ol>`;
  journey.querySelector('[data-studio-stage="plan"]').after(planProgress);
  const planToolbar = document.createElement("div");
  planToolbar.className = "studio-plan-toolbar";
  planToolbar.innerHTML = `<span>Um passo por vez. Você pode voltar e ajustar qualquer escolha.</span><button type="button" id="studio-all-sectors">Ver briefing completo</button>`;
  intro.after(planToolbar);
  const resultAlert = $("#result-alert");
  planToolbar.after(resultAlert);

  // O preenchimento assistido mantém seu handler original e fica junto dos objetivos.
  const assistRow = document.createElement("div");
  assistRow.className = "studio-assist-row";
  if ($("#assist-button")) assistRow.append($("#assist-button"));
  sectors[4].querySelector(".sector-body").prepend(assistRow);
  const chunks = partitionPlanningSectors(sectors);

  const check = document.createElement("section");
  check.className = "studio-final-check";
  check.id = "studio-check-step";
  check.dataset.planningStep = "check";
  check.innerHTML = `<div class="studio-check-heading"><p class="eyebrow">SEU BRIEFING, EM RESUMO</p><h2>As escolhas que vão orientar a escrita.</h2><p>Revise os dados abaixo. Se quiser mudar algo, abra o passo correspondente.</p></div><dl class="studio-check-list"></dl><p class="studio-check-note" id="studio-check-note" role="status"></p><div class="studio-generation-area"><div><p class="eyebrow">DO PLANEJAMENTO À AULA</p><h3>Agora, você decide quando gerar.</h3><p>Avançar pelos passos não faz chamadas à IA. A escrita começa somente pelo botão abaixo, com a sua configuração de acesso.</p></div></div>`;
  const generation = check.querySelector(".studio-generation-area");
  [$(".step-mode-toggle"), $("#generate-button"), $("#ai-cost-chip")].forEach((node) => { if (node) generation.append(node); });
  sectors.at(-1).after(check);
  chunks.set("check", check);
  const footer = document.createElement("section");
  footer.className = "studio-plan-footer";
  footer.innerHTML = `<div class="studio-sector-controls"><button type="button" class="button button-secondary" id="studio-prev">← Passo anterior</button><span id="studio-current-area" aria-live="polite"></span><button type="button" class="button button-primary" id="studio-next">Próximo passo →</button></div>`;
  check.after(footer);

  function makeTools(className, title, note, ids) {
    const section = document.createElement("section");
    section.className = className;
    const heading = document.createElement("h2");
    heading.textContent = title;
    const paragraph = document.createElement("p");
    paragraph.textContent = note;
    const grid = document.createElement("div");
    grid.className = "studio-tool-grid";
    ids.forEach((id) => { const node = document.getElementById(id); if (node) grid.append(node); });
    section.append(heading, paragraph, grid);
    return section;
  }
  const reviewTools = makeTools("studio-review-tools", "Ferramentas de revisão", "Acesse aqui o Mapa de Alinhamento, as Rubricas de Avaliação e as ações de revisão, conforme o conteúdo fica disponível.", ["recalculate-button", "alignment-map-button", "rubrics-button"]);
  const exportTools = makeTools("studio-export-tools", "Central de entrega", "Baixe o Plano de Ensino, o pacote do curso, os materiais docentes e a planilha audiovisual. Os arquivos de cada aula continuam nos cartões abaixo.", ["zip-button", "teacher-pdf-button", "ficha-button", "production-sheet-button"]);
  const importTools = makeTools("studio-import-tools", "Importar um backup ou uma aula", "Restaure um backup do ClassAuthor ou abra uma semana já salva. Os controles originais e seus formatos foram mantidos.", ["restore-backup-button", "open-week-button"]);
  importTools.id = "studio-import-tools";
  footer.after(reviewTools, exportTools, importTools);
  const empty = document.createElement("section");
  empty.className = "studio-empty-view";
  empty.setAttribute("aria-live", "polite");
  empty.innerHTML = `<span class="studio-empty-index" aria-hidden="true">—</span><h2 id="studio-empty-title"></h2><p id="studio-empty-copy"></p><button type="button" class="button button-secondary" id="studio-return-plan">Voltar ao planejamento →</button>`;
  importTools.after(empty);

  const navHeading = document.createElement("div");
  navHeading.className = "studio-nav-heading";
  navHeading.innerHTML = `<p class="eyebrow">SEU PROJETO</p><strong>Percurso de autoria</strong>`;
  navigation.prepend(navHeading);
  const nav = $("#project-navigation");
  const originalLinks = [...nav.querySelectorAll("[data-scroll-to]")];
  const resultLinks = originalLinks.slice(7);
  nav.replaceChildren();
  PLAN_GROUPS.forEach((group) => {
    const label = document.createElement("p");
    label.className = "sidebar-label studio-plan-nav-label";
    label.textContent = group.label;
    nav.append(label);
    PLAN_STEPS.forEach((step, index) => {
      if (step.group !== group.id) return;
      const link = document.createElement("a");
      const targetId = step.sector === null ? check.id : sectors[step.sector].id;
      link.href = `#${targetId}`;
      link.dataset.scrollTo = targetId;
      link.dataset.planStep = step.id;
      link.innerHTML = `<span class="nav-index">${String(index + 1).padStart(2, "0")}</span><span class="nav-copy">${step.label}</span>`;
      nav.append(link);
    });
  });
  const reviewLabel = document.createElement("p");
  reviewLabel.className = "sidebar-label";
  reviewLabel.textContent = "REVISÃO E PRODUÇÃO";
  nav.append(reviewLabel);
  resultLinks.forEach((link) => {
    const label = link.textContent.replace("→", "").trim();
    link.replaceChildren();
    const index = document.createElement("span");
    index.className = "nav-index";
    index.textContent = "↳";
    const copy = document.createElement("span");
    copy.className = "nav-copy";
    copy.textContent = label;
    link.append(index, copy);
    nav.append(link);
  });
  const links = [...nav.querySelectorAll("[data-plan-step]")];
  const storage = document.createElement("details");
  storage.className = "studio-storage";
  storage.innerHTML = `<summary>Arquivos e recuperação <span aria-hidden="true">⌄</span></summary>`;
  const dock = $("#recovery-dock");
  navigation.append(storage);
  if (dock) storage.append(dock);
  const navFooter = document.createElement("div");
  navFooter.className = "studio-nav-footer";
  const styleButton = $("#style-button");
  if (styleButton) navFooter.append(styleButton);
  navigation.append(navFooter);
  summary.querySelector(".sidebar-actions")?.remove();
  const contextNote = document.createElement("section");
  contextNote.className = "studio-context-note";
  contextNote.innerHTML = `<p class="eyebrow">CONTROLE DOCENTE</p><strong>A decisão final é sua.</strong><p>Planejamento, revisão e entrega são espaços diferentes. Seus arquivos só saem quando você escolhe exportar.</p><span>Prévia de teste · site principal intacto</span>`;
  summary.append(contextNote);

  const checkRows = [
    ["course", "Curso e turma"], ["education", "Contexto de ensino"], ["time", "Organização e carga"],
    ["objectives", "Objetivos e conteúdos"], ["methodology", "Abordagem e método"],
    ["academic", "Perfil acadêmico"], ["practice", "Práticas"], ["resources", "Recursos e leituras"],
    ["composition", "Composição ClassAtelier"], ["support", "Materiais de apoio"],
    ["references", "Referências e vídeos"], ["images", "Imagens e diagramas"]
  ];
  checkRows.forEach(([id, label]) => {
    const row = document.createElement("div");
    const name = document.createElement("dt");
    name.textContent = label;
    const value = document.createElement("dd");
    value.dataset.checkValue = id;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.editStep = id;
    button.textContent = "Ajustar ↗";
    button.setAttribute("aria-label", `Ajustar ${label.toLowerCase()}`);
    row.append(name, value, button);
    check.querySelector(".studio-check-list").append(row);
  });
  const lines = (id) => String($("#" + id)?.value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
  const selectedText = (id) => {
    const field = $("#" + id);
    return [...(field?.options || [])].find((option) => option.value === field.value)?.textContent || "Não informado";
  };
  function syncCheck() {
    const unit = $("#course-unit").value === "semana" ? "semana(s)" : "aula(s)";
    const values = {
      course: `${$("#course-title").value.trim() || "Tema ainda não informado"} · ${$("#audience").value.trim() || "Público não informado"} · ${selectedText("level")}`,
      education: selectedText("education-level") + ($("#education-component").value ? ` · ${selectedText("education-component")}` : ""),
      time: `${$("#weeks").value} ${unit} · ${$("#hours").value} h por unidade · ${$("#summary-total").textContent}`,
      objectives: `${lines("objectives")} objetivo(s) · ${$("#content").value.trim() ? "Conteúdo-base informado" : "Conteúdo-base não informado"}`,
      methodology: `${selectedText("pedagogical-approach")} · ${selectedText("methodology-default")}`,
      academic: `${$("#academic-target-words").value} palavras/unidade · ${$("#academic-min-sections").value} seções · ${selectedText("citation-style")}`,
      practice: $("#practice-enabled").checked ? `${$("#practice-count").value} sessão(ões), com agenda própria` : "Não incluídas (opcional)",
      resources: `${$("#resource-default-videos").value} vídeo(s) · ${$("#resource-default-articles").value} artigo(s) · ${$("#resource-default-required").value} leitura(s) obrigatória(s) por unidade. Ajustes específicos nos passos.`,
      composition: $("#summary-composition").textContent,
      support: `${$("#materials-list").children.length} material(is) cadastrado(s)`,
      references: `${lines("references")} referência(s) · ${lines("videos")} link(s) de vídeo · ${lines("video-search-suggestions")} termo(s) de busca`,
      images: `${lines("image-links")} link(s) de imagem · ${lines("image-search-suggestions")} termo(s) de busca`
    };
    Object.entries(values).forEach(([id, value]) => { check.querySelector(`[data-check-value="${id}"]`).textContent = value; });
    const missing = [];
    if (!$("#course-title").value.trim()) missing.push("tema ou título do curso");
    if (!lines("objectives") && !$("#content").value.trim()) missing.push("objetivos ou conteúdo-base");
    const note = $("#studio-check-note");
    note.textContent = missing.length ? `Antes de gerar, informe: ${missing.join("; ")}. Os demais campos e condições serão conferidos pela validação original do ClassAuthor.` : "As informações de base estão preenchidas. Confira as escolhas; a validação original do ClassAuthor permanece ativa ao gerar.";
    note.classList.toggle("needs-input", missing.length > 0);
  }

  function hasResults() {
    return Boolean(!results.classList.contains("hidden") && (!$("#general-plan").classList.contains("hidden") || $("#week-grid").querySelector(".week-card")));
  }
  function hide(node, hidden) { node?.classList.toggle("studio-hidden", hidden); }
  function sync() {
    const planning = view === "plan";
    const planMenuVisible = planning && planMenuOpen;
    const step = PLAN_STEPS[activeStep];
    document.body.dataset.studioView = view;
    document.body.dataset.studioSubstepsOpen = String(planMenuVisible);
    document.body.dataset.planningStep = step.id;
    document.body.classList.toggle("studio-all-sectors", allSectors);
    sectors.forEach((sector, index) => {
      const current = step.sector === index;
      sector.classList.toggle("is-current", current);
      hide(sector, !planning);
      if (planning && (current || allSectors)) sector.open = true;
    });
    chunks.forEach((chunk, id) => hide(chunk, !planning || (!allSectors && id !== step.id)));
    hide(planToolbar, !planning);
    hide(planProgress, !planMenuVisible);
    planProgress.hidden = !planMenuVisible;
    planStage.setAttribute("aria-expanded", String(planMenuVisible));
    hide(footer, !planning);
    hide(reviewTools, view !== "review");
    hide(exportTools, view !== "export");
    hide(importTools, view !== "import");
    hide(results, planning || view === "import" || !hasResults());
    hide(empty, planning || view === "import" || hasResults());
    if (!planning && hasResults()) { results.open = true; $("#results-weeks").open = true; }
    $("#studio-task-title").textContent = planning ? allSectors ? "Seu briefing completo." : step.title : view === "review" ? "Revise antes de liberar." : view === "export" ? "Do seu curso à sala de aula." : "Traga um projeto ou uma aula salva.";
    $("#studio-task-description").textContent = planning ? allSectors ? "Todos os campos e escolhas, preservados. Volte ao foco por passo quando quiser." : step.description : view === "review" ? "Leia as aulas, confira os recursos e aprove o conteúdo com os critérios do seu curso." : view === "export" ? "Escolha o formato de entrega. O ClassAtelier recebe as aulas; você mantém os materiais de mediação." : "Restaure um backup do ClassAuthor ou abra um arquivo de semana salvo neste computador.";
    $("#studio-sector-position").textContent = planning ? `PASSO ${String(activeStep + 1).padStart(2, "0")} / ${PLAN_STEPS.length}` : view === "review" ? "REVISÃO HUMANA" : view === "export" ? "ARQUIVOS E FORMATOS" : "IMPORTAÇÃO DE ARQUIVOS";
    $("#studio-current-area").textContent = `${activeStep + 1} de ${PLAN_STEPS.length}`;
    $("#studio-prev").disabled = activeStep === 0;
    $("#studio-next").disabled = activeStep === PLAN_STEPS.length - 1;
    $("#studio-next").textContent = activeStep === PLAN_STEPS.length - 2 ? "Conferir planejamento →" : "Próximo passo →";
    $("#studio-all-sectors").textContent = allSectors ? "Voltar ao foco por passo" : "Ver briefing completo";
    const groupIndex = PLAN_GROUPS.findIndex((group) => group.id === step.group);
    $("#studio-plan-position").textContent = `Etapa ${String(groupIndex + 1).padStart(2, "0")} de 04`;
    planProgress.querySelectorAll("[data-plan-group]").forEach((button) => {
      const current = button.dataset.planGroup === step.group;
      button.classList.toggle("is-active", current);
      if (current) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
    });
    $("#studio-empty-title").textContent = view === "export" ? "Ainda não há arquivos para entregar." : "Suas aulas aparecerão aqui.";
    $("#studio-empty-copy").textContent = "Gere as aulas a partir do planejamento ou abra um backup em Arquivos e recuperação. Nenhum resultado foi simulado nesta prévia.";
    journey.querySelectorAll("[data-studio-stage]").forEach((button) => {
      const active = button.dataset.studioStage === view;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
    });
    links.forEach((link, index) => {
      const active = planning && index === activeStep;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
    });
    const count = $("#week-grid").querySelectorAll(".week-card").length;
    $("#studio-step-status").textContent = count ? `${count} ${$("#course-unit").value === "semana" ? "semana(s)" : "aula(s)"} disponível(is)` : "Nenhuma aula gerada";
    if (planning && (step.id === "check" || allSectors)) syncCheck();
  }
  function select(nextView, stepIndex = activeStep, focusTitle = false) {
    if (nextView !== "plan") planMenuOpen = false;
    view = nextView;
    activeStep = Math.max(0, Math.min(PLAN_STEPS.length - 1, stepIndex));
    sync();
    center.scrollTop = 0;
    if (window.innerWidth <= 900 && !document.body.classList.contains("welcome-active")) intro.scrollIntoView({ block: "start", behavior: "smooth" });
    if (focusTitle) $("#studio-task-title").focus({ preventScroll: true });
  }
  const goToStep = (index, focusTitle = false) => { allSectors = false; select("plan", index, focusTitle); };
  const planStage = journey.querySelector('[data-studio-stage="plan"]');
  journey.addEventListener("click", (event) => {
    const button = event.target.closest("[data-studio-stage]");
    if (!button) return;
    if (button.dataset.studioStage === "plan") {
      if (view === "plan") planMenuOpen = !planMenuOpen;
      else { planMenuOpen = true; select("plan"); return; }
      sync();
      return;
    }
    planMenuOpen = false;
    select(button.dataset.studioStage);
  });
  // Captura antes da navegação lateral, que interrompe a propagação do clique.
  document.addEventListener("click", (event) => {
    if (planMenuOpen && !planStage.contains(event.target) && !planProgress.contains(event.target)) {
      planMenuOpen = false;
      sync();
    }
  }, true);
  $("#studio-prev").addEventListener("click", () => goToStep(activeStep - 1, true));
  $("#studio-next").addEventListener("click", () => goToStep(activeStep + 1, true));
  $("#studio-return-plan").addEventListener("click", () => select("plan"));
  $("#studio-all-sectors").addEventListener("click", () => { allSectors = !allSectors; sync(); });
  planProgress.addEventListener("click", (event) => {
    const button = event.target.closest("[data-plan-group]");
    if (button) {
      planMenuOpen = true;
      goToStep(PLAN_STEPS.findIndex((step) => step.group === button.dataset.planGroup), true);
    }
  });
  check.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-step]");
    if (button) goToStep(PLAN_STEPS.findIndex((step) => step.id === button.dataset.editStep), true);
  });
  // Interceptar antes dos handlers de rolagem originais; os IDs e raízes permanecem intactos.
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("[data-scroll-to]");
    if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (link.dataset.planStep) {
      goToStep(PLAN_STEPS.findIndex((step) => step.id === link.dataset.planStep), true);
      return;
    }
    select("review");
    const target = document.getElementById(link.dataset.scrollTo);
    if (!target || target.classList.contains("hidden")) {
      if (hasResults()) {
        hide(empty, false);
        $("#studio-empty-title").textContent = "Esta área ainda não está disponível.";
        $("#studio-empty-copy").textContent = link.dataset.scrollTo === "results-production" ? "A produção audiovisual é liberada após a geração e a aprovação das aulas. As condições originais foram mantidas." : "O planejamento precisa ser gerado para preencher esta área.";
      }
      return;
    }
    for (let ancestor = target; ancestor; ancestor = ancestor.parentElement) if (ancestor.tagName === "DETAILS") ancestor.open = true;
    requestAnimationFrame(() => {
      const top = center.scrollTop + target.getBoundingClientRect().top - center.getBoundingClientRect().top - 12;
      if (window.innerWidth > 900) center.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      else target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, true);
  // A validação e os recursos originais podem solicitar foco num campo de outro passo.
  $("#course-form").addEventListener("focusin", (event) => {
    const index = planningStepForField(event.target);
    if (index >= 0 && (view !== "plan" || index !== activeStep) && !allSectors) select("plan", index);
  });
  ["input", "change"].forEach((eventName) => $("#course-form").addEventListener(eventName, () => {
    if (view === "plan" && (PLAN_STEPS[activeStep].id === "check" || allSectors)) syncCheck();
  }));
  let scheduled = false;
  const refresh = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const available = hasResults();
      const firstResults = available && !hadResults;
      hadResults = available;
      // Uma atualização dos resultados não desfaz a área escolhida pelo usuário.
      if (firstResults && view === "plan") select("review");
      else sync();
    });
  };
  const resultObserver = new MutationObserver((records) => {
    const alert = $("#result-alert");
    const validation = alert && !alert.classList.contains("hidden") && alert.classList.contains("error-alert");
    if (validation && !hasResults()) {
      const message = alert.textContent || "";
      const field = /objetivo|conteúdo-base/i.test(message) ? $("#objectives") : /prática/i.test(message) ? $("#practice-enabled") : /bncc|componente curricular/i.test(message) ? $("#education-component") : /tema geral|título do curso/i.test(message) ? $("#course-title") : null;
      const index = field?.id === "practice-enabled" ? PLAN_STEPS.findIndex((step) => step.id === "practice") : planningStepForField(field);
      if (index >= 0) { goToStep(index); requestAnimationFrame(() => field.focus({ preventScroll: true })); }
    }
    if (records.some((record) => record.target === results && record.attributeName === "class")) refresh();
    else sync();
  });
  resultObserver.observe(results, { attributes: true, attributeFilter: ["class"] });
  resultObserver.observe($("#week-grid"), { childList: true });
  resultObserver.observe($("#result-alert"), { attributes: true, attributeFilter: ["class"], childList: true, characterData: true, subtree: true });
  const recoveryObserver = new MutationObserver(() => { if (!$("#draft-recovery").classList.contains("hidden")) storage.open = true; });
  recoveryObserver.observe($("#draft-recovery"), { attributes: true, attributeFilter: ["class"] });
  $("#course-unit").addEventListener("change", refresh);
  $("#new-project-link").addEventListener("click", () => { if (!hasResults()) goToStep(0); });

  // A barra inferior ocupa espaço próprio: nunca deve se sobrepor aos controles.
  const credits = $(".site-footer");
  const syncChrome = () => {
    const footerHeight = credits ? Math.ceil(credits.getBoundingClientRect().height) : 64;
    const journeyHeight = Math.ceil(journey.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--studio-footer-height", `${footerHeight || 64}px`);
    document.documentElement.style.setProperty("--studio-journey-height", `${journeyHeight || 80}px`);
  };
  if (typeof ResizeObserver !== "undefined") {
    const chromeObserver = new ResizeObserver(syncChrome);
    if (credits) chromeObserver.observe(credits);
    chromeObserver.observe(journey);
  }
  window.addEventListener("resize", syncChrome);
  document.body.classList.add("studio-ready");
  hadResults = hasResults();
  sync();
  requestAnimationFrame(syncChrome);
}
