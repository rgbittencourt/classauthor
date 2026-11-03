// Taxonomia de Bloom revisada: níveis, verbos e classificação de um objetivo pelo primeiro verbo.
// Código puro (sem Node): public/bloom.js é cópia idêntica deste arquivo e roda no navegador
// (o Mapa de alinhamento usa). O teste tests/alignment-map.test.mjs confere as duas cópias.

const text = (value) => String(value ?? "").trim();

export const BLOOM_LEVELS = Object.freeze(["lembrar", "entender", "aplicar", "analisar", "avaliar", "criar"]);

const BLOOM_VERBS = {
  lembrar: ["listar", "nomear", "identificar", "reconhecer", "definir", "citar", "recordar", "enumerar", "localizar", "indicar", "apontar", "memorizar"],
  entender: ["explicar", "descrever", "resumir", "interpretar", "classificar", "exemplificar", "parafrasear", "ilustrar", "caracterizar", "situar", "conceituar", "discutir", "inferir", "traduzir"],
  aplicar: ["aplicar", "executar", "usar", "utilizar", "implementar", "calcular", "resolver", "demonstrar", "empregar", "operar", "simular", "realizar", "praticar", "mapear", "preencher", "configurar"],
  analisar: ["analisar", "comparar", "diferenciar", "distinguir", "organizar", "examinar", "investigar", "relacionar", "contrastar", "categorizar", "problematizar", "diagnosticar", "decompor", "correlacionar", "testar"],
  avaliar: ["avaliar", "julgar", "criticar", "justificar", "argumentar", "defender", "verificar", "priorizar", "decidir", "recomendar", "validar", "selecionar", "posicionar-se", "ponderar", "monitorar"],
  criar: ["criar", "elaborar", "planejar", "propor", "projetar", "construir", "desenvolver", "produzir", "formular", "compor", "redigir", "conceber", "prototipar", "desenhar", "estruturar", "gerar", "sistematizar"]
};

export const VAGUE_VERBS = Object.freeze(["compreender", "conhecer", "entender", "saber", "aprender", "apreciar", "perceber", "familiarizar-se", "familiarizar", "conscientizar-se", "conscientizar", "refletir", "estudar", "ver"]);

const VERB_LEVEL = new Map(Object.entries(BLOOM_VERBS).flatMap(([level, verbs]) => verbs.map((verb) => [verb, level])));

// Primeiro verbo do objetivo, ignorando aberturas como "Ao final, o estudante será capaz de".
export function objectiveVerb(objective) {
  const cleaned = text(objective).toLowerCase()
    .replace(/^[-•*\d.)\s]+/, "")
    .replace(/^(ao final[^,:]*[,:]\s*)?((o|a) (estudante|aluno|aluna|participante|cursista)\s+)?(ser[áa] capaz de|poder[áa]|deve(r[áa])?)\s+/, "")
    .replace(/^ser capaz de\s+/, "");
  const match = cleaned.match(/^[a-zà-ú]+(-se)?/);
  return match ? match[0] : "";
}

export function bloomLevel(objective) {
  const verb = objectiveVerb(objective);
  if (!verb) return null;
  if (VAGUE_VERBS.includes(verb)) return "vago";
  return VERB_LEVEL.get(verb) || VERB_LEVEL.get(verb.replace(/-se$/, "")) || null;
}
