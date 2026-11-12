// Imagens sugeridas pela IA que o professor cria fora (ChatGPT, Napkin…) e insere no ClassAtelier.
//
// O ClassAuthor sabe quais figuras do texto ficaram sem imagem (foto, Napkin e diagrama não
// desenhado). Esta parte pura monta a lista por semana, confere quais já foram inseridas (o
// ClassAtelier marca o bloco de imagem com slotId "figure-<id>") e dá o nome do arquivo de
// cópia que vai para a subpasta imagens/ da pasta do projeto.

const text = (value) => String(value ?? "").trim();

export const FIGURE_KIND_LABEL = Object.freeze({ foto: "Foto / imagem", napkin: "Visual do Napkin", diagrama: "Diagrama" });

// Figuras da semana ainda sem imagem própria no plano (as que a IA desenhou em SVG já têm src).
export function figureSuggestions(week, weekNumber = null) {
  const sections = Array.isArray(week?.lessonPlan?.contentSections) ? week.lessonPlan.contentSections : [];
  const number = Number(weekNumber) || Number(week?.meta?.weekNumber) || null;
  return sections.flatMap((section) => (Array.isArray(section?.figures) ? section.figures : [])
    .filter((figure) => figure && !text(figure.src) && text(figure.id))
    .map((figure) => ({
      id: text(figure.id),
      kind: ["foto", "napkin"].includes(figure.kind) ? figure.kind : "diagrama",
      description: text(figure.description),
      caption: text(figure.caption),
      prompt: text(figure.prompt),
      napkinText: text(figure.napkinText),
      sectionNumber: text(figure.sectionNumber || section.number),
      sectionTitle: text(section.title),
      weekNumber: number
    })));
}

// Ids das figuras que já têm imagem inserida nos blocos (procura em qualquer profundidade).
export function insertedFigureIds(blocks) {
  const found = new Set();
  const visit = (node) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    if (node.type === "imagem" && /^figure-/.test(text(node.props?.slotId)) && text(node.props?.src)) found.add(text(node.props.slotId).slice("figure-".length));
    Object.values(node).forEach(visit);
  };
  visit(blocks);
  return found;
}

// Lista final por semana: cada figura com o estado (inserida no editor, marcada à mão ou pendente).
export function figureStatusList(week, { blocks = null, done = {}, weekNumber = null } = {}) {
  const inserted = insertedFigureIds(blocks);
  return figureSuggestions(week, weekNumber).map((figure) => ({
    ...figure,
    inserted: inserted.has(figure.id) || Boolean(done?.[figure.id]),
    how: inserted.has(figure.id) ? "editor" : done?.[figure.id] ? "manual" : ""
  }));
}

// "w2-f3" + napkin + png → "S2-fig-3-napkin.png". Sem id reconhecível: "S2-imagem-<carimbo>.png".
export function figureImageName(figureId, kind, extension, { weekNumber = null, stamp = "" } = {}) {
  const ext = text(extension).replace(/^\./, "").toLowerCase() || "png";
  const match = /^w(\d+)-f(\d+)$/.exec(text(figureId));
  if (match) return `S${Number(match[1])}-fig-${Number(match[2])}-${text(kind) || "foto"}.${ext}`;
  const week = Number(weekNumber) > 0 ? `S${Number(weekNumber)}-` : "";
  return `${week}imagem-${text(stamp) || "avulsa"}.${ext}`;
}
