// A apresentação muda; os controles e renderizadores do ClassAuthor continuam donos dos dados.
const SECTORS = [
  { title: "Identidade do curso", description: "Comece pelo tema, pelo público e pelo contexto educacional.", label: "Identidade" },
  { title: "Tempo e calendário", description: "Defina a duração, a carga de estudo e a organização das aulas.", label: "Tempo e calendário" },
  { title: "Recursos e leituras", description: "Distribua vídeos, artigos e leituras ao longo do curso.", label: "Recursos e leituras" },
  { title: "Composição no ClassAtelier", description: "Escolha os componentes editoriais, a mídia e os interativos das aulas.", label: "Composição da aula" },
  { title: "Intenção pedagógica", description: "Conecte objetivos, conteúdos, metodologia e exigência acadêmica.", label: "Intenção pedagógica" },
  { title: "Práticas e laboratório", description: "Planeje as sessões práticas com agenda própria e materiais do professor.", label: "Práticas / laboratório" },
  { title: "Materiais de apoio", description: "Reúna documentos, referências e links reais para apoiar a autoria.", label: "Materiais de apoio" }
];

export function initializeStudio() {
  const $ = (selector) => document.querySelector(selector);
  const center = $(".form-column");
  const navigation = $(".navigation-column");
  const summary = $(".summary-column");
  const results = $("#results-section");
  if (!center || !navigation || !summary || !results) return;
  const sectors = [...center.querySelectorAll(":scope > .briefing-sector")];
  let activeSector = 0;
  let view = "plan";
  let allSectors = false;
  let hadResults = false;

  const journey = document.createElement("nav");
  journey.className = "studio-journey-bar";
  journey.setAttribute("aria-label", "Etapas da autoria");
  journey.innerHTML = `<button type="button" class="studio-stage" data-studio-stage="plan"><span class="stage-number">01</span><span><strong>Planejar</strong><small>Contexto e escolhas</small></span></button><button type="button" class="studio-stage" data-studio-stage="review"><span class="stage-number">02</span><span><strong>Revisar</strong><small>Aulas e aprovação</small></span></button><button type="button" class="studio-stage" data-studio-stage="export"><span class="stage-number">03</span><span><strong>Exportar</strong><small>Materiais e entrega</small></span></button><span class="studio-step-status" id="studio-step-status"></span>`;
  $(".workspace-grid").before(journey);

  const intro = $(".intro");
  intro.innerHTML = `<div class="studio-task-meta"><p class="eyebrow">ESTÚDIO DE AUTORIA</p><span id="studio-sector-position"></span></div><h1 id="studio-task-title"></h1><p class="intro-copy" id="studio-task-description"></p>`;
  const planToolbar = document.createElement("div");
  planToolbar.className = "studio-plan-toolbar";
  planToolbar.innerHTML = `<span>Uma área por vez. Todas as escolhas continuam disponíveis.</span><button type="button" id="studio-all-sectors">Ver briefing completo</button>`;
  intro.after(planToolbar);
  const resultAlert = $("#result-alert");
  planToolbar.after(resultAlert);

  const footer = document.createElement("section");
  footer.className = "studio-plan-footer";
  footer.innerHTML = `<div class="studio-sector-controls"><button type="button" class="button button-secondary" id="studio-prev">← Área anterior</button><span id="studio-current-area"></span><button type="button" class="button button-secondary" id="studio-next">Próxima área →</button></div><div class="studio-generation-area"><div><p class="eyebrow">DO PLANEJAMENTO À AULA</p><h3>Pronto para escrever o curso?</h3><p>A IA usa as sete áreas do briefing. Você revisa antes de liberar cada aula.</p></div></div>`;
  const generation = footer.querySelector(".studio-generation-area");
  [$(".step-mode-toggle"), $("#generate-button"), $("#ai-cost-chip")].forEach((node) => { if (node) generation.append(node); });
  sectors.at(-1)?.after(footer);
  // Voltar o preenchimento assistido à área onde ele atua, sem clonar seu handler.
  const assistRow = document.createElement("div");
  assistRow.className = "studio-assist-row";
  assistRow.append($("#assist-button"));
  sectors[4]?.querySelector(".sector-body")?.prepend(assistRow);

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
  const reviewTools = makeTools("studio-review-tools", "Ferramentas de revisão", "Confira qualidade, alinhamento e critérios de avaliação. As ações são liberadas conforme o conteúdo fica disponível.", ["recalculate-button", "alignment-map-button", "rubrics-button"]);
  const exportTools = makeTools("studio-export-tools", "Central de entrega", "Baixe o pacote do curso, os materiais docentes e a planilha audiovisual. Os arquivos de cada aula continuam nos cartões abaixo.", ["zip-button", "teacher-pdf-button", "ficha-button", "production-sheet-button"]);
  footer.after(reviewTools, exportTools);
  const empty = document.createElement("section");
  empty.className = "studio-empty-view";
  empty.setAttribute("aria-live", "polite");
  empty.innerHTML = `<span class="studio-empty-index" aria-hidden="true">—</span><h2 id="studio-empty-title"></h2><p id="studio-empty-copy"></p><button type="button" class="button button-secondary" id="studio-return-plan">Voltar ao planejamento →</button>`;
  exportTools.after(empty);

  const navHeading = document.createElement("div");
  navHeading.className = "studio-nav-heading";
  navHeading.innerHTML = `<p class="eyebrow">SEU PROJETO</p><strong>Percurso de autoria</strong>`;
  navigation.prepend(navHeading);
  const links = [...$("#project-navigation").querySelectorAll("[data-scroll-to]")];
  links.forEach((link, index) => {
    const label = SECTORS[index]?.label || link.textContent.replace("→", "").trim();
    link.replaceChildren();
    const number = document.createElement("span");
    number.className = "nav-index";
    number.textContent = index < 7 ? String(index + 1).padStart(2, "0") : "↳";
    const copy = document.createElement("span");
    copy.className = "nav-copy";
    copy.textContent = label;
    link.append(number, copy);
    if (index === 7) {
      const labelNode = document.createElement("p");
      labelNode.className = "sidebar-label";
      labelNode.textContent = "REVISÃO E PRODUÇÃO";
      link.before(labelNode);
    }
  });
  $("#project-navigation .sidebar-label").textContent = "PLANEJAMENTO";
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

  function hasResults() {
    return Boolean(!results.classList.contains("hidden") && (!$("#general-plan").classList.contains("hidden") || $("#week-grid").querySelector(".week-card")));
  }
  function hide(node, hidden) { node?.classList.toggle("studio-hidden", hidden); }
  function sync() {
    const planning = view === "plan";
    document.body.dataset.studioView = view;
    document.body.classList.toggle("studio-all-sectors", allSectors);
    sectors.forEach((sector, index) => {
      sector.classList.toggle("is-current", index === activeSector);
      hide(sector, !planning);
      if (planning && (index === activeSector || allSectors)) sector.open = true;
    });
    hide(planToolbar, !planning);
    hide(footer, !planning);
    hide(reviewTools, view !== "review");
    hide(exportTools, view !== "export");
    hide(results, planning || !hasResults());
    hide(empty, planning || hasResults());
    if (!planning && hasResults()) { results.open = true; $("#results-weeks").open = true; }
    $("#studio-task-title").textContent = planning ? SECTORS[activeSector].title : view === "review" ? "Revise antes de liberar." : "Do seu curso à sala de aula.";
    $("#studio-task-description").textContent = planning ? SECTORS[activeSector].description : view === "review" ? "Leia as aulas, confira os recursos e aprove o conteúdo com os critérios do seu curso." : "Escolha o formato de entrega. O ClassAtelier recebe as aulas; você mantém os materiais de mediação.";
    $("#studio-sector-position").textContent = planning ? `ÁREA ${String(activeSector + 1).padStart(2, "0")} / 07` : view === "review" ? "REVISÃO HUMANA" : "ARQUIVOS E FORMATOS";
    $("#studio-current-area").textContent = `${activeSector + 1} de 7`;
    $("#studio-prev").disabled = activeSector === 0;
    $("#studio-next").disabled = activeSector === sectors.length - 1;
    $("#studio-all-sectors").textContent = allSectors ? "Voltar ao foco por área" : "Ver briefing completo";
    $("#studio-empty-title").textContent = view === "export" ? "Ainda não há arquivos para entregar." : "Suas aulas aparecerão aqui.";
    $("#studio-empty-copy").textContent = "Gere as aulas a partir do planejamento ou abra um backup em Arquivos e recuperação. Nenhum resultado foi simulado nesta prévia.";
    journey.querySelectorAll("[data-studio-stage]").forEach((button) => {
      const active = button.dataset.studioStage === view;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "step"); else button.removeAttribute("aria-current");
    });
    links.forEach((link, index) => {
      const active = planning && index === activeSector;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
    });
    const count = $("#week-grid").querySelectorAll(".week-card").length;
    $("#studio-step-status").textContent = count ? `${count} ${$("#course-unit").value === "semana" ? "semana(s)" : "aula(s)"} disponível(is)` : "Nenhuma aula gerada";
  }
  function select(nextView, sector = activeSector) {
    view = nextView;
    activeSector = Math.max(0, Math.min(sectors.length - 1, sector));
    sync();
    center.scrollTop = 0;
    if (window.innerWidth <= 900 && !document.body.classList.contains("welcome-active")) intro.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  journey.addEventListener("click", (event) => { const button = event.target.closest("[data-studio-stage]"); if (button) select(button.dataset.studioStage); });
  $("#studio-prev").addEventListener("click", () => select("plan", activeSector - 1));
  $("#studio-next").addEventListener("click", () => select("plan", activeSector + 1));
  $("#studio-return-plan").addEventListener("click", () => select("plan"));
  $("#studio-all-sectors").addEventListener("click", () => { allSectors = !allSectors; sync(); });
  // Interceptar antes dos handlers de rolagem originais; os IDs e raízes permanecem intactos.
  $("#project-navigation").addEventListener("click", (event) => {
    const link = event.target.closest("[data-scroll-to]");
    if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const index = links.indexOf(link);
    if (index < 7) { allSectors = false; select("plan", index); return; }
    select("review");
    const target = document.getElementById(link.dataset.scrollTo);
    if (!target || target.classList.contains("hidden")) {
      if (hasResults()) {
        hide(empty, false);
        $("#studio-empty-title").textContent = "Esta área ainda não está disponível.";
        $("#studio-empty-copy").textContent = index === 10 ? "A produção audiovisual é liberada após a geração e a aprovação das aulas. As condições originais foram mantidas." : "O planejamento precisa ser gerado para preencher esta área.";
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
  // Mostra o setor de um campo que a validação ou outro recurso original tentar focar.
  $("#course-form").addEventListener("focusin", (event) => {
    const sector = event.target.closest(".briefing-sector");
    if (sector && (view !== "plan" || !sector.classList.contains("is-current")) && !allSectors) select("plan", sectors.indexOf(sector));
  });
  let scheduled = false;
  const refresh = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const available = hasResults();
      if (available !== hadResults) { hadResults = available; select(available ? "review" : "plan", available ? activeSector : 0); }
      else sync();
    });
  };
  const resultObserver = new MutationObserver((records) => {
    const alert = $("#result-alert");
    const validation = alert && !alert.classList.contains("hidden") && alert.classList.contains("error-alert");
    if (validation && !hasResults()) {
      const message = alert.textContent || "";
      const target = /objetivo|conteúdo-base/i.test(message) ? 4 : /prática/i.test(message) ? 5 : /bncc|componente curricular|tema geral|título do curso/i.test(message) ? 0 : -1;
      if (target >= 0) {
        select("plan", target);
        const field = target === 4 ? $("#objectives") : target === 5 ? $("#practice-enabled") : message.includes("BNCC") || message.includes("componente curricular") ? $("#education-component") : $("#course-title");
        requestAnimationFrame(() => field?.focus({ preventScroll: true }));
      }
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
  $("#new-project-link").addEventListener("click", () => { if (!hasResults()) select("plan", 0); });
  document.body.classList.add("studio-ready");
  hadResults = hasResults();
  sync();
}
