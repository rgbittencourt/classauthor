// Referencial administrativo da Taxonomia Revisada de Bloom.
// Síntese operacional baseada nos materiais guardados na biblioteca privada.

import { BLOOM_LEVELS, bloomLevel, objectiveVerb } from "./bloom.js";

export const BLOOM_REFERENCE_PROFILE = Object.freeze({
  title: "Taxonomia Revisada de Bloom para planejamento e avaliação",
  sources: Object.freeze([
    Object.freeze({ authors: "Ana Paula do Carmo Marcheti Ferraz; Renato Vairo Belhot", title: "Taxonomia de Bloom: revisão teórica e apresentação das adequações do instrumento para definição de objetivos instrucionais", publication: "Gestão & Produção, v. 17, n. 2, p. 421-431", year: 2010 }),
    Object.freeze({ authors: "Glaucimeire de Carvalho Pereira; Maria Auxiliadora Motta Barreto", title: "(RE)construindo as práticas avaliativas com a Taxonomia Revisada de Bloom", publication: "Manual didático, 1. ed., Lorena", year: 2024 }),
    Object.freeze({ authors: "Material de orientação pedagógica", title: "Taxonomia de Bloom: orientações para redigir competências, habilidades e atitudes", publication: "Guia de aplicação", year: "s.d." })
  ]),
  processDimensions: Object.freeze([
    Object.freeze({ id: "lembrar", label: "Lembrar", definition: "Reconhecer ou recuperar informação relevante da memória." }),
    Object.freeze({ id: "entender", label: "Entender", definition: "Construir significado por interpretação, exemplificação, classificação, resumo, inferência, comparação ou explicação." }),
    Object.freeze({ id: "aplicar", label: "Aplicar", definition: "Executar ou usar um procedimento em uma situação." }),
    Object.freeze({ id: "analisar", label: "Analisar", definition: "Decompor informação, distinguir partes relevantes e reconhecer relações ou organização." }),
    Object.freeze({ id: "avaliar", label: "Avaliar", definition: "Julgar com base em critérios e padrões explícitos." }),
    Object.freeze({ id: "criar", label: "Criar", definition: "Reorganizar elementos para gerar produto, plano, estrutura ou solução nova e coerente." })
  ]),
  knowledgeDimensions: Object.freeze([
    Object.freeze({ id: "factual", label: "Factual", definition: "Elementos básicos, terminologia e detalhes necessários para atuar na área." }),
    Object.freeze({ id: "conceitual", label: "Conceitual", definition: "Categorias, princípios, modelos, relações e estruturas que organizam o conhecimento." }),
    Object.freeze({ id: "procedimental", label: "Procedimental", definition: "Métodos, técnicas, algoritmos e critérios para saber como fazer." }),
    Object.freeze({ id: "metacognitivo", label: "Metacognitivo", definition: "Conhecimento sobre estratégias, condições de uso e sobre o próprio processo de aprender." })
  ]),
  objectivePattern: "verbo observável + objeto de conhecimento + contexto ou condição pertinente",
  alignmentRule: "atividade, evidência e avaliação devem exigir demanda cognitiva compatível com o verbo do objetivo; mencionar o mesmo tema não basta",
  progressionRule: "a progressão deve ser intencional e adequada ao público; os níveis ajudam a planejar complexidade, mas não formam uma escada rígida para toda tarefa"
});

export const BLOOM_KNOWLEDGE_DIMENSIONS = Object.freeze(BLOOM_REFERENCE_PROFILE.knowledgeDimensions.map((item) => item.id));

export function usesValidatedBloomReference(input = {}) {
  return input.requireValidatedBloomReference === true || input.pedagogicalApproach === "nova";
}

export function bloomReferenceBlock({ compact = false } = {}) {
  if (compact) return `REFERENCIAL INSTITUCIONAL OBRIGATÓRIO — TAXONOMIA REVISADA DE BLOOM
- Processos cognitivos: lembrar, entender, aplicar, analisar, avaliar e criar.
- Conhecimento: factual, conceitual, procedimental e metacognitivo.
- Objetivo completo: ${BLOOM_REFERENCE_PROFILE.objectivePattern}.
- Alinhamento: ${BLOOM_REFERENCE_PROFILE.alignmentRule}.
- Não classifique só pelo assunto: confira a ação que o estudante realmente precisa executar.`;
  return `REFERENCIAL INSTITUCIONAL OBRIGATÓRIO — TAXONOMIA REVISADA DE BLOOM
Fontes administrativas: ${BLOOM_REFERENCE_PROFILE.sources.map((item) => `${item.authors}. ${item.title}. ${item.publication}, ${item.year}`).join("; ")}.
Dimensão do processo cognitivo:
${BLOOM_REFERENCE_PROFILE.processDimensions.map((item) => `- ${item.label}: ${item.definition}`).join("\n")}
Dimensão do conhecimento:
${BLOOM_REFERENCE_PROFILE.knowledgeDimensions.map((item) => `- ${item.label}: ${item.definition}`).join("\n")}
Regras obrigatórias:
- Escreva cada objetivo como ${BLOOM_REFERENCE_PROFILE.objectivePattern}.
- Classifique o objetivo pelo processo exigido e pelo conhecimento mobilizado.
- ${BLOOM_REFERENCE_PROFILE.alignmentRule}.
- ${BLOOM_REFERENCE_PROFILE.progressionRule}.
- Um verbo isolado não garante o nível: examine a tarefa, o produto, os critérios e o contexto.
Use este referencial ANTES de definir objetivos, atividades ou avaliação; volte a ele na validação final.`;
}

export function auditBloomObjective(objective = "") {
  const value = String(objective || "").trim();
  const verb = objectiveVerb(value);
  const level = bloomLevel(value);
  const words = value.replace(/^[-•*\d.)\s]+/, "").split(/\s+/u).filter(Boolean);
  return {
    objective: value,
    verb,
    level,
    observable: BLOOM_LEVELS.includes(level),
    complete: words.length >= 4,
    issues: [
      !verb && "objetivo sem verbo inicial identificável",
      level === "vago" && "verbo vago ou não diretamente observável",
      verb && level == null && "verbo não classificado no referencial",
      words.length < 4 && "objetivo sem objeto e contexto suficientes"
    ].filter(Boolean)
  };
}
