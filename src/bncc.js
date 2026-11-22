import { BNCC_CATALOG } from "./bncc-catalog.js";

const text = (value) => String(value ?? "").trim();
const list = (value) => Array.isArray(value) ? value : [];

export const EDUCATION_LEVELS = Object.freeze([
  ["educacao-infantil", "Educação Infantil"], ["fundamental", "Ensino Fundamental"], ["medio", "Ensino Médio"],
  ["fic", "Formação Inicial e Continuada (FIC)"], ["graduacao", "Graduação"], ["pos-lato", "Pós-graduação Lato Sensu"],
  ["pos-mestrado", "Pós-graduação Stricto Sensu - Mestrado"], ["pos-doutorado", "Pós-graduação Stricto Sensu - Doutorado"],
  ["treinamento", "Treinamento"], ["oficina", "Oficina"], ["outro", "Outro"]
].map(([id, label]) => Object.freeze({ id, label })));

export const BNCC_COMPONENTS = Object.freeze({
  fundamental: Object.freeze([
    ["LP", "Língua Portuguesa"], ["AR", "Arte"], ["EF", "Educação Física"], ["LI", "Língua Inglesa"], ["MA", "Matemática"],
    ["CI", "Ciências"], ["GE", "Geografia"], ["HI", "História"], ["ER", "Ensino Religioso"]
  ].map(([id, label]) => Object.freeze({ id, label }))),
  medio: Object.freeze([
    ["LGG", "Linguagens e suas Tecnologias"], ["LP", "Língua Portuguesa"], ["MAT", "Matemática e suas Tecnologias"],
    ["CNT", "Ciências da Natureza e suas Tecnologias"], ["CHS", "Ciências Humanas e Sociais Aplicadas"]
  ].map(([id, label]) => Object.freeze({ id, label })))
});

const validLevel = (value) => EDUCATION_LEVELS.some((item) => item.id === value) ? value : "outro";
const componentList = (level) => BNCC_COMPONENTS[level] || [];

export function normalizeEducationIdentity(value = {}, legacy = {}) {
  const source = value && typeof value === "object" ? value : {};
  const educationLevel = validLevel(text(source.educationLevel || source.level || legacy.educationLevel));
  const bnccEnabled = ["fundamental", "medio"].includes(educationLevel);
  const grade = bnccEnabled ? Math.max(1, Math.min(educationLevel === "fundamental" ? 9 : 3, Number.parseInt(source.grade || source.year, 10) || 1)) : null;
  const component = componentList(educationLevel).some((item) => item.id === text(source.component)) ? text(source.component) : "";
  return {
    educationLevel,
    educationLevelLabel: EDUCATION_LEVELS.find((item) => item.id === educationLevel)?.label || text(source.customLevel || "Outro"),
    grade,
    component,
    componentLabel: componentList(educationLevel).find((item) => item.id === component)?.label || "",
    bnccEnabled,
    requestedCodes: list(source.requestedCodes || source.codes).map((item) => text(typeof item === "string" ? item : item?.code).toUpperCase()).filter(Boolean)
  };
}

function fundamentalGradeMatches(code, grade) {
  const span = code.slice(2, 4);
  if (/^\d{2}$/.test(span) && Number(span) === grade) return true;
  return ({ 1: ["12", "15"], 2: ["12", "15", "25"], 3: ["15", "35"], 4: ["15"], 5: ["15"], 6: ["67", "69"], 7: ["67", "69"], 8: ["69", "89"], 9: ["69", "89"] }[grade] || []).includes(span);
}

export function bnccCatalogFor(identity = {}) {
  const profile = normalizeEducationIdentity(identity);
  if (!profile.bnccEnabled || !profile.component) return [];
  return BNCC_CATALOG.filter((item) => {
    if (profile.educationLevel === "fundamental") return item.code.startsWith("EF") && item.code.slice(4, 6) === profile.component && fundamentalGradeMatches(item.code, profile.grade);
    if (profile.component === "LP") return item.code.startsWith("EM13LP");
    return item.code.startsWith(`EM13${profile.component}`);
  });
}

const stop = new Set("a o as os de da do das dos e em no na nos nas para por com sem um uma que se ao aos à às sua seu suas seus como sobre entre ou".split(" "));
const words = (value) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((word) => !stop.has(word)) || [];

export function bnccCandidates(identity = {}, context = "", limit = 24) {
  const query = new Set(words(context));
  const requested = new Set(normalizeEducationIdentity(identity).requestedCodes);
  return bnccCatalogFor(identity).map((item) => {
    const terms = words(item.description);
    const overlap = terms.reduce((sum, term) => sum + (query.has(term) ? 1 : 0), 0);
    const exact = [...query].reduce((sum, term) => sum + (item.description.toLowerCase().includes(term) ? 0.2 : 0), 0);
    return { ...item, score: overlap + exact + (requested.has(item.code) ? 100 : 0) };
  }).sort((a, b) => b.score - a.score || a.code.localeCompare(b.code, "pt-BR")).slice(0, Math.max(1, limit));
}

export function bnccReferenceBlock(input = {}, limit = 24) {
  const identity = normalizeEducationIdentity(input.educationIdentity, input);
  if (!identity.bnccEnabled) return "";
  const context = [input.title, input.content, ...(input.objectives || [])].join(" ");
  const candidates = bnccCandidates(identity, context, limit);
  return `REFERENCIAL BNCC OBRIGATÓRIO - MEC, 2018\nEtapa: ${identity.educationLevelLabel}; ano/série: ${identity.grade}º; componente/área: ${identity.componentLabel}.\nUse somente códigos da lista abaixo. Escolha apenas habilidades realmente trabalhadas e preserve literalmente código e descrição. Não cite a BNCC de forma decorativa: cada código deve estar ligado a objetivo, atividade e evidência.\n${candidates.map((item) => `- ${item.code}: ${item.description}`).join("\n")}`;
}

export function normalizeBnccAlignment(value, identity = {}) {
  const catalog = new Map(bnccCatalogFor(identity).map((item) => [item.code, item]));
  return list(value).map((entry) => typeof entry === "string" ? { code: entry } : entry || {}).map((entry) => {
    const code = text(entry.code).toUpperCase();
    const official = catalog.get(code);
    return {
      code,
      description: official?.description || text(entry.description),
      objective: text(entry.objective),
      activity: text(entry.activity),
      evidence: text(entry.evidence)
    };
  }).filter((entry, index, rows) => entry.code && rows.findIndex((item) => item.code === entry.code) === index);
}

export function validateBnccAlignment(plan = {}, identity = {}) {
  const profile = normalizeEducationIdentity(identity);
  if (!profile.bnccEnabled) return { applicable: false, pass: true, issues: [], alignments: [] };
  const catalog = new Map(bnccCatalogFor(profile).map((item) => [item.code, item]));
  const alignments = normalizeBnccAlignment(plan.bnccAlignment, profile);
  const issues = [];
  if (!profile.component) issues.push("Selecione o componente curricular ou a área da BNCC.");
  if (!alignments.length) issues.push("Nenhuma habilidade da BNCC foi vinculada à aula.");
  alignments.forEach((entry) => {
    const official = catalog.get(entry.code);
    if (!official) issues.push(`${entry.code}: código incompatível com a etapa, o ano/série ou o componente selecionado.`);
    if (official && entry.description !== official.description) issues.push(`${entry.code}: a descrição não corresponde ao texto oficial armazenado.`);
    if (!entry.objective || !entry.activity || !entry.evidence) issues.push(`${entry.code}: informe objetivo, atividade e evidência de aprendizagem.`);
  });
  return { applicable: true, pass: issues.length === 0, issues, alignments };
}

export { BNCC_CATALOG };
