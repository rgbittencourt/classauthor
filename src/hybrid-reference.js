// Perfis compilados do referencial institucional de Ensino Híbrido.
// Fonte-base: BACICH, L.; TANZI NETO, A.; TREVISANI, F. M. (org.).
// Ensino híbrido: personalização e tecnologia na educação. Penso, 2015.
// São sínteses operacionais: entram antes do planejamento e voltam na validação.

const SOURCE = Object.freeze({
  title: "Ensino híbrido: personalização e tecnologia na educação",
  authors: "Lilian Bacich; Adolfo Tanzi Neto; Fernando de Mello Trevisani (org.)",
  publisher: "Penso",
  year: 2015,
  url: "https://luislindner.github.io/moodle-ifsc/CMS/B_ehbacich/ensino-hibrido.xhtml",
  modelsSection: "Capítulo 2 — Modelos"
});

const profile = (value) => Object.freeze({ source: SOURCE, ...value });

export const HYBRID_METHOD_PROFILES = Object.freeze([
  profile({ id: "rotacao-estacoes", label: "Rotação por estações", examplePage: 192, evidenceLevel: "validated-example",
    definition: "A turma percorre estações com atividades diferentes, e pelo menos uma delas utiliza aprendizagem on-line. As estações trabalham o mesmo objetivo por experiências complementares.",
    planningPrinciples: ["definir de duas a quatro estações coerentes com o mesmo objetivo", "incluir ao menos uma estação on-line com função pedagógica clara", "definir ordem ou regra de rotação, duração e capacidade", "explicitar produto e papéis em cada estação", "planejar uma síntese que conecte as estações"],
    requiredEvidence: ["estações identificadas", "tempo por estação", "atividade on-line", "papéis por estação", "síntese ou avaliação integradora"],
    planningQuestions: ["Quantos grupos e dispositivos estarão disponíveis?", "As estações podem funcionar simultaneamente?", "Como será feita a troca entre estações?"] }),
  profile({ id: "laboratorio-rotacional", label: "Laboratório rotacional", examplePage: 201, evidenceLevel: "validated-example",
    definition: "Os estudantes alternam, em horários definidos, entre a sala de aula e um laboratório ou ambiente tecnológico. A etapa on-line complementa o trabalho presencial.",
    planningPrinciples: ["separar a etapa em sala e a etapa no laboratório", "definir rotação, tempos e logística", "usar a atividade on-line para investigar, praticar, produzir ou obter dados", "conectar a produção do laboratório à etapa da sala", "prever acompanhamento e alternativa para falha de acesso"],
    requiredEvidence: ["dois ambientes definidos", "tempo em cada ambiente", "atividade on-line", "conexão entre as etapas", "plano alternativo"],
    planningQuestions: ["O laboratório comporta toda a turma?", "Quem acompanha cada espaço?", "Qual é o plano B sem internet?"] }),
  profile({ id: "rotacao-individual", label: "Rotação individual", examplePage: 223, evidenceLevel: "validated-example",
    definition: "Cada estudante segue uma agenda personalizada e não precisa passar por todas as estações. O percurso decorre de evidências anteriores e das necessidades identificadas.",
    planningPrinciples: ["definir a evidência que determina a agenda individual", "oferecer percursos com finalidades distintas, sem obrigar todos a fazer tudo", "registrar critérios transparentes de encaminhamento", "prever tutoria e acompanhamento", "usar as produções para atualizar o percurso seguinte"],
    requiredEvidence: ["diagnóstico inicial", "agenda individual", "critérios de encaminhamento", "tutoria", "replanejamento pós-avaliação"],
    planningQuestions: ["Que dado orientará cada agenda?", "Quais atividades são essenciais?", "Como o estudante acompanhará seu progresso?"] }),
  profile({ id: "sala-invertida", label: "Sala de aula invertida", examplePage: 215, evidenceLevel: "validated-example",
    definition: "O primeiro contato orientado com o tema ocorre antes do encontro, por atividade on-line, leitura, vídeo, jogo ou exploração. O tempo compartilhado é usado para discutir, aplicar, produzir e receber tutoria.",
    planningPrinciples: ["propor antes do encontro uma experiência orientada com registro observável", "prever uma forma breve de conhecer o que os estudantes fizeram", "começar o encontro recuperando dúvidas ou evidências da preparação", "usar o encontro para aplicação, análise, produção ou resolução", "prever alternativa para quem não realizou a preparação"],
    requiredEvidence: ["atividade antes do encontro", "registro da preparação", "retomada diagnóstica", "aplicação durante o encontro", "alternativa para não preparação"],
    planningQuestions: ["Quanto tempo o estudante terá antes do encontro?", "Como registrará o que fez?", "O que acontecerá com quem chegar sem a preparação?"] }),
  profile({ id: "flex", label: "Flex", examplePage: 241, evidenceLevel: "validated-example",
    definition: "A aprendizagem on-line é o eixo principal, com ritmo e caminho flexíveis. O professor oferece tutoria e intervenções presenciais, individuais ou em pequenos grupos conforme a necessidade.",
    planningPrinciples: ["organizar um plano de estudos on-line flexível", "explicitar metas, atividades, recursos e evidências", "prever tutoria e intervenções sob demanda", "permitir escolhas sem perder objetivos essenciais", "usar dados do percurso para orientar apoio e próximos passos"],
    requiredEvidence: ["plano de estudos on-line", "flexibilidade de ritmo ou caminho", "tutoria", "escolhas do estudante", "uso de dados para personalizar"],
    planningQuestions: ["Quais partes são obrigatórias?", "Como o professor saberá quem precisa de ajuda?", "Que escolhas o estudante poderá fazer?"] }),
  profile({ id: "a-la-carte", label: "À la carte", examplePage: null, evidenceLevel: "reference-only",
    definition: "O estudante cursa uma ou mais disciplinas inteiramente on-line, enquanto as demais experiências escolares continuam presenciais.",
    planningPrinciples: ["delimitar a disciplina ou unidade integralmente on-line", "definir acompanhamento, comunicação e avaliação no ambiente virtual", "articular a oferta on-line com o restante do percurso presencial"],
    requiredEvidence: ["componente integralmente on-line", "ambiente e tutoria definidos", "articulação com o percurso presencial"], planningQuestions: ["Qual componente será integralmente on-line?", "Quem fará a tutoria?", "Como ocorrerá a integração com o curso?"] }),
  profile({ id: "virtual-aprimorado", label: "Virtual aprimorado", examplePage: null, evidenceLevel: "reference-only",
    definition: "A maior parte da experiência acontece on-line, com encontros presenciais periódicos, obrigatórios e planejados para finalidades específicas.",
    planningPrinciples: ["organizar o percurso predominantemente on-line", "definir frequência e finalidade dos encontros presenciais", "garantir acompanhamento contínuo entre os encontros"],
    requiredEvidence: ["percurso predominantemente on-line", "encontros presenciais periódicos", "acompanhamento contínuo"], planningQuestions: ["Qual é a periodicidade presencial?", "O que só faz sentido presencialmente?", "Como o estudante será acompanhado a distância?"] })
]);

export function hybridProfileFor(id = "") { return HYBRID_METHOD_PROFILES.find((item) => item.id === String(id || "").trim()) || null; }

export function hybridReferenceBlock(id = "", { includeTemplate = false } = {}) {
  const item = hybridProfileFor(id);
  if (!item) return "";
  return `REFERENCIAL INSTITUCIONAL OBRIGATÓRIO — ENSINO HÍBRIDO
Fonte: ${item.source.authors}. ${item.source.title}. ${item.source.publisher}, ${item.source.year}. ${item.source.modelsSection}${item.examplePage ? `; plano-exemplo na p. ${item.examplePage}` : ""}.
Modelo: ${item.label}.
Síntese operacional: ${item.definition}
Princípios obrigatórios:
${item.planningPrinciples.map((rule) => `- ${rule}.`).join("\n")}
Evidências mínimas: ${item.requiredEvidence.join("; ")}.
Resolva no planejamento: ${item.planningQuestions.join("; ")}.
Use este perfil ANTES de redigir. Não produza uma aula genérica para depois renomeá-la como ${item.label}.${includeTemplate ? "\nA ficha do professor deve registrar identidade, modelo, objetivos, conteúdos, personalização, recursos, espaços/etapas, duração, papéis, avaliação e personalização pós-avaliação." : ""}`;
}

// Política institucional: uma metodologia sem referencial publicado não pode ser aplicada
// silenciosamente com conhecimento genérico do modelo de IA.
export function referencePolicyFor(id = "") {
  const item = hybridProfileFor(id);
  return item ? { allowed: true, profile: item, reason: "referencial-validado" } : { allowed: false, profile: null, reason: "referencial-ainda-nao-cadastrado" };
}
