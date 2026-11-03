// Rubricas de avaliação: estrutura, normalização, pontuação e exportações (Moodle CSV e planilha).
//
// Código puro (sem Node): public/rubric-core.js é cópia idêntica deste arquivo e roda no navegador.
// Uma rubrica é gerada só quando o professor pede (nunca automaticamente). Cada critério tem um peso
// (em %) e quatro níveis de desempenho; a pontuação de cada nível sai do peso do critério e da
// nota máxima (padrão 10, a mesma escala do restante do ClassAuthor).

export const RUBRIC_LEVELS = Object.freeze([
  Object.freeze({ key: "excellent", label: "Excelente", pct: 100 }),
  Object.freeze({ key: "good", label: "Bom", pct: 75 }),
  Object.freeze({ key: "fair", label: "Regular", pct: 50 }),
  Object.freeze({ key: "insufficient", label: "Insuficiente", pct: 0 })
]);
export const RUBRIC_MAX_SCORE = 10;

const text = (value, fallback = "") => String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
const round2 = (value) => Math.round(value * 100) / 100;

// Distribui os pesos para somar exatamente 100 (inteiros), mantendo as proporções.
export function balanceWeights(weights) {
  const raw = weights.map((value) => Math.max(0, Number(value) || 0));
  const total = raw.reduce((sum, value) => sum + value, 0);
  if (!raw.length) return [];
  const base = total > 0 ? raw.map((value) => value * 100 / total) : raw.map(() => 100 / raw.length);
  const floors = base.map(Math.floor);
  let left = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = base.map((value, index) => ({ index, frac: value - Math.floor(value) })).sort((a, b) => b.frac - a.frac);
  for (let i = 0; left > 0 && order.length; i = (i + 1) % order.length, left -= 1) floors[order[i].index] += 1;
  return floors;
}

// Aceita a resposta da IA (levels como objeto ou lista) ou uma rubrica já salva.
export function normalizeRubricData(raw = {}, meta = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const criteriaRaw = Array.isArray(source.criteria) ? source.criteria : [];
  const readLevel = (criterion, level, position) => {
    const levels = criterion.levels;
    if (Array.isArray(criterion.descriptions)) return text(criterion.descriptions[position]);
    if (Array.isArray(levels)) return text(levels[position]?.description ?? levels[position]);
    if (levels && typeof levels === "object") return text(levels[level.key] ?? levels[level.label] ?? levels[level.label.toLowerCase()]);
    return "";
  };
  const picked = criteriaRaw.slice(0, 6).map((criterion, index) => {
    const item = criterion && typeof criterion === "object" ? criterion : {};
    return { name: text(item.name || item.criterion || item.title, `Critério ${index + 1}`), weight: Number(item.weight ?? item.peso) || 0, descriptions: RUBRIC_LEVELS.map((level, position) => readLevel(item, level, position)) };
  }).filter((criterion) => criterion.name);
  const weights = balanceWeights(picked.map((criterion) => criterion.weight));
  return {
    id: text(meta.id || source.id, `rubric-${Date.now().toString(36)}`),
    title: text(meta.title || source.title, "Rubrica"),
    weekIndex: Number.isInteger(meta.weekIndex) ? meta.weekIndex : (Number.isInteger(source.weekIndex) ? source.weekIndex : null),
    source: meta.source || source.source || null,
    maxScore: Number(source.maxScore) > 0 ? Number(source.maxScore) : RUBRIC_MAX_SCORE,
    criteria: picked.map((criterion, index) => ({ ...criterion, weight: weights[index] })),
    notes: text(source.notes || source.guidance),
    createdAt: text(meta.createdAt || source.createdAt) || new Date().toISOString()
  };
}

// Pontos de um nível de um critério.
export function levelScore(rubric, criterion, levelPosition) {
  return round2((criterion.weight / 100) * rubric.maxScore * (RUBRIC_LEVELS[levelPosition].pct / 100));
}

// Avisos que a pessoa precisa ver antes de usar a rubrica.
export function rubricIssues(rubric) {
  const out = [];
  if (!rubric.criteria.length) out.push("A rubrica não tem critérios.");
  const total = rubric.criteria.reduce((sum, criterion) => sum + (Number(criterion.weight) || 0), 0);
  if (rubric.criteria.length && total !== 100) out.push(`Os pesos somam ${total}%, e não 100%.`);
  rubric.criteria.forEach((criterion) => {
    if (!(Number(criterion.weight) > 0)) out.push(`O critério «${criterion.name}» tem peso 0: todos os níveis dariam 0 ponto e o Moodle recusa níveis com a mesma pontuação.`);
    const empty = criterion.descriptions.filter((description) => !text(description)).length;
    if (empty) out.push(`O critério «${criterion.name}» tem ${empty} nível(is) sem descrição.`);
  });
  return out;
}

const csvCell = (value) => {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV no formato do plugin «Rubric Importer» do Moodle (cabeçalho criterion,level,level_description,score).
// O Moodle puro não importa rubricas de arquivo: o CSV exige esse plugin (Moodle 4.1 ou mais novo).
// Nível 1 = melhor desempenho. A descrição leva o nome do nível para ficar legível no Moodle.
export function rubricMoodleCsv(rubric) {
  const rows = [["criterion", "level", "level_description", "score"]];
  rubric.criteria.forEach((criterion) => {
    RUBRIC_LEVELS.forEach((level, position) => {
      rows.push([`${criterion.name} (${criterion.weight}%)`, position + 1, `${level.label}: ${text(criterion.descriptions[position])}`, levelScore(rubric, criterion, position)]);
    });
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

const sheetName = (title, used) => {
  let base = text(title, "Rubrica").replace(/[\\/?*[\]:]/g, " ").slice(0, 28).trim() || "Rubrica";
  let name = base, n = 2;
  while (used.has(name.toLowerCase())) name = `${base.slice(0, 25)} ${n++}`;
  used.add(name.toLowerCase());
  return name;
};

// Uma aba por rubrica: critérios nas linhas, níveis nas colunas, com a pontuação no cabeçalho.
export function rubricSheets(rubrics) {
  const used = new Set();
  return rubrics.map((rubric) => ({
    name: sheetName(rubric.title, used),
    columns: [{ header: "Critério", width: 30 }, { header: "Peso (%)", width: 10, center: true }].concat(RUBRIC_LEVELS.map((level) => ({ header: `${level.label} (${level.pct}%)`, width: 38 }))),
    rows: rubric.criteria.map((criterion) => [criterion.name, criterion.weight].concat(RUBRIC_LEVELS.map((level, position) => `${text(criterion.descriptions[position])}  [${levelScore(rubric, criterion, position)} pts]`)))
      .concat([["Nota máxima", 100].concat(RUBRIC_LEVELS.map(() => ""))])
  }));
}

export const rubricFileSlug = (value) => text(value, "rubrica").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "rubrica";

// ── Para copiar e colar (Moodle, Word, Planilhas) ──
const pts = (value) => String(value).replace(".", ",");
const escapeHtml = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Níveis do menor para o maior desempenho: é a ordem em que o editor de rubrica do Moodle costuma ser preenchido.
export const RUBRIC_LEVELS_ASCENDING = Object.freeze(RUBRIC_LEVELS.map((level, position) => ({ ...level, position })).reverse());

// Texto puro, simples de ler e de colar em qualquer campo.
export function rubricPlainText(rubric) {
  const lines = [`Rubrica: ${rubric.title}`, `Nota máxima: ${pts(rubric.maxScore)}`, ""];
  rubric.criteria.forEach((criterion, index) => {
    lines.push(`${index + 1}. ${criterion.name} (peso ${criterion.weight}%)`);
    RUBRIC_LEVELS.forEach((level, position) => lines.push(`   ${level.label} (${pts(levelScore(rubric, criterion, position))} pts): ${text(criterion.descriptions[position])}`));
    lines.push("");
  });
  if (rubric.notes) lines.push(`Como usar: ${rubric.notes}`);
  return lines.join("\n").trim() + "\n";
}

// Tabela separada por tabulações: cola célula a célula no Excel e no Google Planilhas.
export function rubricTsv(rubric) {
  const clean = (value) => String(value ?? "").replace(/[\t\r\n]+/g, " ").trim();
  const rows = [["Critério", "Peso (%)"].concat(RUBRIC_LEVELS.map((level) => `${level.label} (${level.pct}%)`))];
  rubric.criteria.forEach((criterion) => rows.push([clean(criterion.name), String(criterion.weight)].concat(RUBRIC_LEVELS.map((level, position) => `${clean(criterion.descriptions[position])} [${pts(levelScore(rubric, criterion, position))} pts]`))));
  return rows.map((row) => row.join("\t")).join("\n") + "\n";
}

// Tabela HTML formatada: ao colar num editor de texto do Moodle (descrição de tarefa, página, fórum) ou no Word, vira tabela.
export function rubricHtmlTable(rubric) {
  const cell = (tag, value, extra = "") => `<${tag} style="border:1px solid #999;padding:6px;vertical-align:top;${extra}">${value}</${tag}>`;
  const head = `<tr>${cell("th", "Critério", "background:#eee;text-align:left")}${cell("th", "Peso", "background:#eee")}${RUBRIC_LEVELS.map((level) => cell("th", `${escapeHtml(level.label)} (${level.pct}%)`, "background:#eee;text-align:left")).join("")}</tr>`;
  const rows = rubric.criteria.map((criterion) => `<tr>${cell("td", `<strong>${escapeHtml(criterion.name)}</strong>`)}${cell("td", `${criterion.weight}%`, "text-align:center")}${RUBRIC_LEVELS.map((level, position) => cell("td", `${escapeHtml(criterion.descriptions[position])}<br><em>${pts(levelScore(rubric, criterion, position))} pts</em>`)).join("")}</tr>`).join("");
  return `<p><strong>${escapeHtml(rubric.title)}</strong> (nota máxima ${pts(rubric.maxScore)})</p><table style="border-collapse:collapse;width:100%"><thead>${head}</thead><tbody>${rows}</tbody></table>${rubric.notes ? `<p><em>Como usar: ${escapeHtml(rubric.notes)}</em></p>` : ""}`;
}

// Valores para colar campo a campo no editor de rubrica do Moodle.
export function rubricFieldValue(rubric, criterionIndex, field) {
  const criterion = rubric.criteria[criterionIndex];
  if (!criterion) return "";
  if (field === "name") return criterion.name;
  const match = /^(def|pts)(\d)$/.exec(field);
  if (!match) return "";
  const position = Number(match[2]);
  return match[1] === "def" ? text(criterion.descriptions[position]) : pts(levelScore(rubric, criterion, position));
}
