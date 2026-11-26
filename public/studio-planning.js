// Mapa de apresentação: os IDs, dados e eventos dos controles originais são preservados.
export const PLAN_GROUPS = [
  { id: "course", label: "O curso", description: "Identidade, contexto e tempo" },
  { id: "pedagogy", label: "Escolhas pedagógicas", description: "Intenção, método e exigência" },
  { id: "materials", label: "Materiais da aula", description: "Recursos, composição e fontes" },
  { id: "check", label: "Conferir e gerar", description: "Suas escolhas antes da IA" }
];

export const PLAN_STEPS = [
  { id: "course", group: "course", sector: 0, label: "Curso e turma", title: "Que curso você quer criar?", description: "Dê um nome ao curso e situe o público e o nível da turma." },
  { id: "education", group: "course", sector: 0, label: "Contexto de ensino", title: "Em que contexto você ensina?", description: "Defina a modalidade de ensino e, quando aplicável, o ano e o componente da BNCC." },
  { id: "time", group: "course", sector: 1, label: "Tempo e calendário", title: "Qual é o tempo do percurso?", description: "Organize por aulas ou semanas, distribua a carga horária e defina o calendário." },
  { id: "objectives", group: "pedagogy", sector: 4, label: "Objetivos e conteúdos", title: "O que a turma deve aprender?", description: "Explicite os objetivos, os conteúdos essenciais e o recorte que orientará a escrita." },
  { id: "methodology", group: "pedagogy", sector: 4, label: "Abordagem e metodologias", title: "Como a aprendizagem acontece?", description: "Escolha a abordagem, o arco didático e as metodologias que fazem sentido para o curso." },
  { id: "academic", group: "pedagogy", sector: 4, label: "Perfil acadêmico", title: "Qual é a exigência do conteúdo?", description: "Ajuste profundidade, citações, autores, referências e critérios acadêmicos em um espaço próprio." },
  { id: "practice", group: "pedagogy", sector: 5, label: "Práticas e laboratório", title: "Haverá encontros de prática?", description: "Se fizer sentido, ative sessões práticas ou síncronas com agenda própria. Este passo é opcional." },
  { id: "resources", group: "materials", sector: 2, label: "Recursos e leituras", title: "Quanto material cabe em cada aula?", description: "Defina o volume de vídeos, artigos e leituras, com ajustes específicos por aula ou semana." },
  { id: "composition", group: "materials", sector: 3, label: "Composição ClassAtelier", title: "Como a aula ganha forma?", description: "Escolha os componentes editoriais, a mídia e os interativos das aulas no ClassAtelier." },
  { id: "support", group: "materials", sector: 6, label: "Materiais de apoio", title: "Que apoio você quer oferecer?", description: "Cadastre os materiais de apoio e situe seu uso pedagógico. Os links ficam nos próximos passos." },
  { id: "references", group: "materials", sector: 6, label: "Referências e vídeos", title: "Quais fontes sustentam o curso?", description: "Reúna referências, livros, documentos e vídeos reais, ou indique termos para pesquisar vídeos." },
  { id: "images", group: "materials", sector: 6, label: "Imagens e diagramas", title: "O que vale mostrar visualmente?", description: "Informe imagens já conferidas ou termos de busca. Verifique licença e crédito antes de usar." },
  { id: "check", group: "check", sector: null, label: "Conferir e gerar", title: "Confira antes de pedir a escrita.", description: "Revise suas escolhas e o modo de aprovação. A geração só começa quando você aciona o botão." }
];

export function partitionPlanningSectors(sectors) {
  const chunks = new Map();
  const doc = sectors[0].ownerDocument;
  const create = (id, sectorIndex) => {
    const chunk = doc.createElement("div");
    chunk.className = "studio-planning-chunk";
    chunk.dataset.planningStep = id;
    sectors[sectorIndex].querySelector(".sector-body").append(chunk);
    chunks.set(id, chunk);
    return chunk;
  };
  const field = (id) => doc.getElementById(id)?.closest(".field");
  const move = (chunk, nodes) => nodes.filter(Boolean).forEach((node) => chunk.append(node));

  const identityBody = sectors[0].querySelector(".sector-body");
  const identityGrid = identityBody.querySelector(".field-grid");
  const course = create("course", 0);
  const education = create("education", 0);
  const educationGrid = doc.createElement("div");
  educationGrid.className = "field-grid two";
  move(educationGrid, [field("education-level"), field("education-grade"), field("education-component")]);
  education.append(educationGrid);
  course.append(identityGrid);

  const intentionBody = sectors[4].querySelector(".sector-body");
  const objectives = create("objectives", 4);
  const methodology = create("methodology", 4);
  const academic = create("academic", 4);
  move(objectives, [intentionBody.querySelector(".studio-assist-row"), field("objectives"), field("content"), doc.getElementById("assistant-note")]);
  move(methodology, [field("didactic-mode"), doc.getElementById("methodology-box")]);
  move(academic, [intentionBody.querySelector(".academic-profile-box")]);

  const support = create("support", 6);
  const references = create("references", 6);
  const images = create("images", 6);
  move(support, [doc.getElementById("materials-list"), doc.getElementById("add-material")]);
  move(references, [field("references"), field("videos"), field("video-search-suggestions")]);
  move(images, [field("image-links"), field("image-search-suggestions")]);

  [["time", 1], ["resources", 2], ["composition", 3], ["practice", 5]].forEach(([id, index]) => {
    const body = sectors[index].querySelector(".sector-body");
    const nodes = [...body.children];
    const chunk = create(id, index);
    move(chunk, nodes);
  });
  return chunks;
}

export function planningStepForField(field) {
  if (field?.id === "practice-enabled") return PLAN_STEPS.findIndex((step) => step.id === "practice");
  return PLAN_STEPS.findIndex((step) => step.id === field?.closest("[data-planning-step]")?.dataset.planningStep);
}
