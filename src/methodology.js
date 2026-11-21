// Abordagem pedagógica e metodologias ativas.
//
// "atual": a geração segue exatamente como na v1.2.1 (nenhum bloco extra nos prompts).
// "nova": planejamento reverso (Wiggins & McTighe), objetivos com verbos observáveis e
// equilíbrio cognitivo (Bloom revisada, Anderson & Krathwohl), alinhamento construtivo
// (Biggs) e princípios de aprendizagem multimídia (Mayer) nos materiais.
// As metodologias ativas podem ser escolhidas por semana em qualquer abordagem.

import { hybridProfileFor } from "./hybrid-reference.js";
import { VALIDATED_METHOD_REFERENCE_PROFILES, activeMethodReferenceBlock, activeMethodReferencePolicy } from "./active-method-reference.js";
import { auditBloomObjective, bloomReferenceBlock, usesValidatedBloomReference } from "./bloom-reference.js";

const text = (value) => String(value ?? "").trim();
const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

export const PEDAGOGICAL_APPROACHES = Object.freeze([
  { id: "atual", label: "Atual (como até a versão 1.2.1)" },
  { id: "nova", label: "Nova: planejamento reverso, Bloom e multimídia" }
]);

export const ACTIVE_METHODS = Object.freeze([
  {
    id: "sala-invertida",
    label: "Sala de aula invertida",
    hint: "O estudo vem antes; o tempo junto é para aplicar.",
    text: "O texto é o estudo prévio: deixe explícito, logo na abertura, que ele prepara uma tarefa de aplicação. Feche cada bloco de duas ou três seções com uma pergunta curta de autoverificação (\"Antes de seguir, você consegue…?\"). A síntese diz exatamente o que o estudante precisa trazer pronto para a aplicação.",
    activities: "Uma verificação rápida de leitura (quiz formativo curto ou 3 perguntas) que o estudante faz logo depois do texto; uma atividade principal de APLICAÇÃO do conteúdo a uma situação nova (fórum ou produto curto), que não seja possível responder só copiando o texto; se houver webprática na semana, ela é o momento síncrono de aplicação.",
    mediation: "Mostre ao professor como usar o resultado da verificação de leitura para decidir o que retomar antes da aplicação, e como reagir a quem chega sem ter estudado.",
    keywords: ["invertid", "prévi", "aplica"]
  },
  {
    id: "estudo-de-caso",
    label: "Estudo de caso",
    hint: "Um caso real ou realista conduz a semana.",
    text: "Construa a semana em torno de UM caso âncora, real (com fonte) ou explicitamente apresentado como caso ilustrativo. Apresente o caso cedo, com dados e dilemas suficientes para análise, e use os conceitos das seções seguintes para lê-lo. Não entregue a solução do caso no texto: deixe o dilema aberto para a atividade.",
    activities: "A atividade principal é a análise do caso: perguntas em níveis crescentes (o que aconteceu → por quê, à luz dos conceitos → o que você recomendaria e com que critérios), com entrega no fórum ou como produto curto, e critérios que valorizem o uso dos conceitos da semana.",
    mediation: "Dê ao professor perguntas de aprofundamento para o fórum, sinais de análise superficial (só resumir o caso) e como devolver a pergunta para o estudante pensar.",
    keywords: ["caso"]
  },
  {
    id: "pbl",
    label: "Aprendizagem Baseada em Problemas (ABP/PBL)",
    hint: "Um problema aberto vem antes da teoria.",
    text: "Abra a semana com um problema aberto e contextualizado, sem resposta única, ANTES de apresentar os conceitos. Em seguida, organize as seções como as perguntas que alguém precisaria responder para enfrentar esse problema. Não resolva o problema no texto.",
    activities: "Estruture a atividade principal nas etapas da ABP: (1) o que já sabemos e o que precisamos descobrir, (2) investigação orientada com as seções e os recursos da semana, (3) proposta de solução justificada, (4) reflexão sobre o que foi aprendido. Critérios avaliam a qualidade da justificativa, não a resposta \"certa\".",
    mediation: "Oriente o professor a atuar como tutor: perguntas que destravam sem dar a resposta, sinais de grupo/estudante travado e como ajustar o escopo do problema.",
    keywords: ["problema"]
  },
  {
    id: "projetos",
    label: "Aprendizagem Baseada em Projetos",
    hint: "A semana avança uma entrega de um projeto maior.",
    text: "Deixe claro qual parte do projeto da disciplina esta semana faz avançar e por quê. Cada seção deve contribuir para essa entrega parcial; use exemplos do tipo de produto que o estudante vai construir.",
    activities: "A atividade principal é uma ENTREGA PARCIAL do projeto (marco desta semana), com checklist do que entregar, rubrica com critérios observáveis e um espaço de feedback entre pares ou do professor antes da versão final.",
    mediation: "Mostre ao professor como acompanhar o marco: o que conferir na entrega parcial, sinais de projeto desalinhado e como dar feedback que o estudante consiga usar na próxima etapa.",
    keywords: ["projeto", "entrega"]
  },
  {
    id: "peer-instruction",
    label: "Instrução por pares (Peer Instruction)",
    hint: "Questões conceituais, discussão entre pares e nova resposta.",
    text: "Destaque, em cada seção, o ponto conceitual que costuma ser mal entendido e explique por que a confusão acontece; isso alimenta as questões conceituais da semana.",
    activities: "Questões conceituais (não de memorização) com alternativas que representem as confusões reais; o fluxo é: responder sozinho → discutir com colegas no fórum, justificando → responder de novo. Em EaD, adapte a votação para quiz e a discussão para fórum; se houver webprática, use o ciclo completo ao vivo.",
    mediation: "Explique ao professor como ler a distribuição das respostas (muitos acertos: avançar; dividido: discussão entre pares; muitos erros: retomar o conceito) e como conduzir a rodada de discussão.",
    keywords: ["pares", "conceitua"]
  },
  {
    id: "ensino-sob-medida",
    label: "Ensino sob medida (Just-in-Time Teaching)",
    hint: "Respostas prévias dos estudantes ajustam a aula antes do encontro.",
    text: "Proponha antes do encontro uma tarefa curta que revele dúvidas e raciocínios. O conteúdo do encontro deve responder às evidências coletadas, deixando explícito o que foi ajustado.",
    activities: "Tarefa antecipada com prazo para análise; triagem das respostas; retomada seletiva dos pontos frágeis; atividade de aplicação adaptada ao diagnóstico; devolutiva mostrando como as respostas orientaram a aula.",
    mediation: "Analise as respostas antes do encontro, agrupe padrões sem expor estudantes e prepare explicações ou tarefas diferentes para as necessidades encontradas.",
    keywords: ["antes do encontro", "respostas", "ajust", "diagnóstico"]
  },
  {
    id: "tbl",
    label: "Aprendizagem Baseada em Equipes (TBL)",
    hint: "Preparação, teste individual, teste em equipe e aplicação significativa.",
    text: "Organize o conteúdo para preparação prévia e para uma decisão de aplicação comum a equipes estáveis. Dê base para que os estudantes justifiquem respostas e apelações.",
    activities: "Preparação; teste individual de garantia; o mesmo teste respondido em equipe; feedback e apelação fundamentada; problema significativo comum com escolha específica e relato simultâneo; avaliação entre pares quando pertinente.",
    mediation: "Mantenha equipes estáveis, cobre consenso fundamentado, trate apelações com evidências e compare as decisões das equipes antes de explicar.",
    keywords: ["equipe", "teste individual", "garantia", "apelação"]
  },
  {
    id: "poe",
    label: "Método POE (Predizer, Observar e Explicar)",
    hint: "Previsão justificada, observação registrada e explicação da diferença.",
    text: "Apresente um fenômeno sem antecipar sua explicação. O estudante precisa prever e justificar antes de observar; depois compara evidências e reconstrói a explicação.",
    activities: "Predição individual justificada; observação ou experimento com registro; comparação entre previsão e resultado; explicação conceitual; revisão explícita da ideia inicial.",
    mediation: "Não confirme a resposta antes da observação; valorize previsões como diagnóstico e use as divergências para discutir modelos explicativos.",
    keywords: ["predi", "observ", "explic", "previsão"]
  },
  {
    id: "gamificacao",
    label: "Gamificação",
    hint: "Missões, níveis e feedback imediato ligados aos objetivos.",
    text: "Mantenha o texto acadêmico, mas apresente o percurso da semana como uma sequência de missões ligadas aos objetivos, anunciadas na abertura.",
    activities: "Organize as atividades como missões em níveis (do básico ao desafio), cada uma ligada a um objetivo, com feedback imediato e pontuação ou insígnia por missão. A pontuação nunca substitui os critérios de aprendizagem: deixe claro o que conta para a nota.",
    mediation: "Dê ao professor orientações para manter o engajamento sem competição excessiva e para acolher quem fica para trás nas missões.",
    keywords: ["missão", "missões", "nível", "níveis"]
  },
  {
    id: "aprendizagem-jogos",
    label: "Aprendizagem Baseada em Jogos",
    hint: "Um jogo completo é o ambiente de aprendizagem e termina com debriefing.",
    text: "Prepare os conceitos e decisões que o jogo exigirá. Diferencie aprendizagem baseada em jogos de simples pontuação: aqui há um jogo com meta, regras, desafios e consequências.",
    activities: "Jogo alinhado aos objetivos, com enredo ou contexto, meta, regras, desafios e decisões; registro de estratégias; feedback durante a experiência; debriefing que liga ações e resultados aos conceitos.",
    mediation: "Garanta participação, observe estratégias e conduza o debriefing; jogar sem reflexão final não completa a metodologia.",
    keywords: ["jogo", "regras", "desafio", "debriefing"]
  },
  {
    id: "storytelling",
    label: "Storytelling",
    hint: "Pesquisa e narrativa com propósito, evidências, roteiro e compartilhamento.",
    text: "O estudante transforma pesquisa em narrativa para um público definido. Preserve a precisão factual e organize começo, conflito, desenvolvimento e desfecho.",
    activities: "Definir propósito e público; investigar; selecionar evidências; escrever narrativa e roteiro; produzir com recursos adequados; compartilhar; receber feedback e refletir sobre conteúdo e processo.",
    mediation: "Separe critérios de conteúdo e de expressão, ajude a distinguir criação narrativa de invenção de evidências e ofereça modelos antes da produção.",
    keywords: ["narrativa", "roteiro", "história", "público"]
  },
  {
    id: "escape-room",
    label: "Escape room educacional",
    hint: "Enigmas cooperativos encadeados, tempo definido e reflexão final.",
    text: "Apresente uma missão narrativa cujo avanço dependa da aplicação do conteúdo. Cada enigma deve corresponder a um objetivo, não apenas esconder códigos.",
    activities: "Missão, regras e tempo; enigmas encadeados; grupos e papéis; pistas graduadas; teste prévio; registro das estratégias; debriefing sobre decisões, colaboração e aprendizagem.",
    mediation: "Distribua pistas sem retirar o desafio, observe a participação e use o debriefing para transformar a experiência em aprendizagem explícita.",
    keywords: ["enigma", "pista", "missão", "debriefing"]
  },
  {
    id: "pesquisa",
    label: "Ensino com pesquisa",
    hint: "Pergunta investigável, fontes ou dados, análise e comunicação dos resultados.",
    text: "Estruture a semana em torno de uma pergunta investigável. Ensine a selecionar fontes, organizar dados, analisar limites e sustentar conclusões.",
    activities: "Pergunta e hipótese; plano de investigação; busca ou coleta; avaliação de confiabilidade; organização e análise; conclusão; comunicação com referências e reflexão sobre limites.",
    mediation: "Acompanhe o recorte da pergunta, ensine integridade acadêmica e devolva perguntas que façam o estudante relacionar evidência e conclusão.",
    keywords: ["pesquisa", "pergunta", "fontes", "dados", "evidência"]
  },
  {
    id: "wac",
    label: "Escrita através do currículo (WAC)",
    hint: "Escrever para aprender e comunicar nos gêneros próprios da área.",
    text: "Use a escrita tanto para pensar o conteúdo quanto para comunicar em um gênero autêntico da área. Defina propósito, audiência e critérios antes da produção.",
    activities: "Registro exploratório; análise de modelo do gênero; rascunho; feedback; revisão; versão final ou reflexão metacognitiva, com critérios separados para conteúdo e comunicação.",
    mediation: "Dê feedback utilizável na revisão, não corrija apenas a superfície e deixe claro quando a escrita é para aprender e quando é para avaliação formal.",
    keywords: ["escrita", "gênero", "rascunho", "revisão", "audiência"]
  },
  {
    id: "juri-simulado",
    label: "Júri simulado / debate",
    hint: "Posições em disputa, com argumentos fundamentados.",
    text: "Apresente a questão controversa da semana de forma justa, com os melhores argumentos de cada lado e as evidências que os sustentam, sem tomar partido no texto.",
    activities: "Defina a questão do júri ou do debate, os papéis (defesa, acusação, jurados ou equivalentes), o material-base de cada lado (seções do texto e recursos), o roteiro das rodadas e os critérios de avaliação dos argumentos. Em EaD, adapte para fórum em rodadas ou para a webprática.",
    mediation: "Oriente o professor a mediar o debate com respeito, a cobrar evidência em cada argumento e a fazer o fechamento que reconcilia as posições com os objetivos.",
    keywords: ["júri", "juri", "debate", "argument"]
  },
  {
    id: "rotacao-estacoes",
    label: "Rotação por estações",
    hint: "Três ou quatro estações com tarefas diferentes.",
    text: "Organize as seções de modo que possam ser estudadas como estações relativamente independentes, cada uma com uma tarefa própria ao final.",
    activities: "De 3 a 4 estações com tarefas diferentes (por exemplo: leitura com perguntas, vídeo com análise, exercício prático, discussão), tempo sugerido e produto de cada uma; ao final, uma síntese que integre as estações. Funciona melhor no presencial ou na webprática; em EaD assíncrona, transforme as estações em trilhas da semana.",
    mediation: "Explique ao professor como organizar o tempo e os grupos, e como fazer o fechamento que integra o que foi visto em cada estação.",
    keywords: ["estaç", "trilha"]
  },
  {
    id: "laboratorio-rotacional",
    label: "Laboratório rotacional",
    hint: "Alternância planejada entre sala e laboratório ou ambiente tecnológico.",
    text: hybridProfileFor("laboratorio-rotacional").definition,
    activities: hybridProfileFor("laboratorio-rotacional").planningPrinciples.join("; "),
    mediation: "Acompanhe a conexão entre os ambientes, a logística da rotação e quem precisa de tutoria; mantenha um plano B sem acesso ou equipamento.",
    keywords: ["laboratório", "laboratorio", "rotação", "rotacao"]
  },
  {
    id: "rotacao-individual",
    label: "Rotação individual",
    hint: "Cada estudante segue uma agenda definida por suas necessidades.",
    text: hybridProfileFor("rotacao-individual").definition,
    activities: hybridProfileFor("rotacao-individual").planningPrinciples.join("; "),
    mediation: "Use evidências para encaminhar cada estudante, acompanhe o progresso e atualize a agenda; nem todos precisam passar pelas mesmas atividades.",
    keywords: ["agenda", "individual", "percurso", "diagnóstico"]
  },
  {
    id: "flex",
    label: "Flex",
    hint: "Percurso on-line flexível, com tutoria e intervenções sob demanda.",
    text: hybridProfileFor("flex").definition,
    activities: hybridProfileFor("flex").planningPrinciples.join("; "),
    mediation: "Circule, ofereça tutoria individual ou em pequenos grupos e use dados do percurso para decidir intervenções e agrupamentos.",
    keywords: ["plano de estudos", "ritmo", "tutoria", "flex"]
  },
  {
    id: "a-la-carte",
    label: "À la carte",
    hint: "Uma ou mais disciplinas integralmente on-line, articuladas ao percurso presencial.",
    text: hybridProfileFor("a-la-carte").definition,
    activities: hybridProfileFor("a-la-carte").planningPrinciples.join("; "),
    mediation: "Garanta tutoria, comunicação e avaliação no ambiente virtual e articule o componente on-line às demais experiências do curso.",
    keywords: ["disciplina", "online", "on-line", "tutoria"]
  },
  {
    id: "virtual-aprimorado",
    label: "Virtual aprimorado",
    hint: "Percurso predominantemente on-line com encontros presenciais periódicos.",
    text: hybridProfileFor("virtual-aprimorado").definition,
    activities: hybridProfileFor("virtual-aprimorado").planningPrinciples.join("; "),
    mediation: "Acompanhe continuamente o percurso on-line e reserve os encontros presenciais para finalidades que realmente dependam da presença.",
    keywords: ["virtual", "online", "on-line", "presencial", "periódico"]
  },
  {
    id: "design-thinking",
    label: "Design thinking",
    hint: "Empatia, definição, ideação e protótipo.",
    text: "Apresente um desafio real centrado em pessoas e use as seções para dar os conceitos necessários a cada fase (empatia, definição, ideação, protótipo e teste).",
    activities: "Estruture a atividade principal nas fases do design thinking, com uma entrega curta por fase (mapa de empatia, pergunta \"Como poderíamos…?\", ideias, protótipo simples) e critérios que valorizem a ligação com o usuário real.",
    mediation: "Oriente o professor a manter o foco no usuário, a evitar soluções prontas cedo demais e a dar feedback sobre o protótipo.",
    keywords: ["empatia", "protótipo", "prototip", "como poderíamos"]
  }
]);

export const METHOD_CHOICES = Object.freeze([
  { id: "nenhuma", label: "Nenhuma específica" },
  { id: "auto", label: "A IA escolhe e justifica" },
  ...ACTIVE_METHODS.map(({ id, label }) => ({ id, label }))
]);

const methodById = (id) => ACTIVE_METHODS.find((method) => method.id === id) || null;
const validChoice = (id) => METHOD_CHOICES.some((choice) => choice.id === id);

const VALIDATION_RULES = Object.freeze({
  "sala-invertida": [
    { id: "preparation", label: "estudo ou preparação antes do encontro/aplicação", patterns: [/estudo\s+pr[eé]vio/i, /antes\s+(?:do|da|de)\s+(?:encontro|aula|aplica)/i, /prepara(?:ç[aã]o|r)/i] },
    { id: "verification", label: "verificação da preparação ou leitura", patterns: [/verifica(?:ç[aã]o|r)/i, /autoverifica/i, /quiz/i, /perguntas?\s+(?:de|da)\s+leitura/i] },
    { id: "application", label: "aplicação do conteúdo a uma situação nova", patterns: [/aplica(?:ç[aã]o|r)/i, /situa(?:ç[aã]o|ções)\s+nov/i, /resolver/i, /produzir/i] }
  ],
  "estudo-de-caso": [
    { id: "case", label: "caso âncora com dados, contexto ou dilema", patterns: [/caso\s+(?:[aâ]ncora|real|ilustrativo|contextualizado)/i, /estudo\s+de\s+caso/i, /dilema/i] },
    { id: "analysis", label: "análise do caso com uso dos conceitos", patterns: [/analis(?:ar|e|ando)/i, /[àa]\s+luz\s+d[eo]s?\s+conceitos/i, /diagn[oó]stic/i] },
    { id: "decision", label: "decisão, recomendação ou solução justificada", patterns: [/recomend/i, /decis[aã]o/i, /solu(?:ç[aã]o|ções)\s+justific/i, /justifi(?:car|que)/i] }
  ],
  pbl: [
    { id: "open-problem", label: "problema aberto apresentado antes da solução", patterns: [/problema\s+aberto/i, /sem\s+(?:uma\s+)?resposta\s+[uú]nica/i, /situa(?:ç[aã]o|ções)[- ]problema/i] },
    { id: "investigation", label: "levantamento do que já se sabe e investigação do que falta", patterns: [/o\s+que\s+(?:j[aá]\s+)?sabemos/i, /precisamos\s+(?:descobrir|investigar)/i, /investiga(?:ç[aã]o|r)/i] },
    { id: "solution-reflection", label: "solução justificada e reflexão sobre a aprendizagem", patterns: [/proposta\s+de\s+solu(?:ç[aã]o|ções)/i, /solu(?:ç[aã]o|ções)\s+justific/i, /reflex[aã]o\s+(?:sobre|do)\s+(?:o\s+)?(?:aprendizado|aprendizagem)/i] }
  ],
  projetos: [
    { id: "project-delivery", label: "entrega ou marco concreto do projeto", patterns: [/entrega\s+parcial/i, /marco\s+(?:do|de)\s+projeto/i, /produto\s+(?:do|de)\s+projeto/i] },
    { id: "criteria", label: "critérios observáveis ou rubrica para a entrega", patterns: [/rubrica/i, /crit[eé]rios?\s+(?:observ[aá]ve|de\s+avalia)/i, /checklist/i] },
    { id: "feedback", label: "momento de feedback antes da versão final", patterns: [/feedback\s+(?:entre\s+pares|do\s+professor)/i, /revis[aã]o\s+por\s+pares/i, /antes\s+da\s+vers[aã]o\s+final/i] }
  ],
  "peer-instruction": [
    { id: "individual-answer", label: "resposta individual inicial a uma questão conceitual", patterns: [/responder?\s+(?:primeiro\s+)?sozinh/i, /resposta\s+individual/i, /quest[aã]o\s+conceitual/i] },
    { id: "peer-discussion", label: "discussão entre pares com justificativa", patterns: [/discuss[aã]o\s+entre\s+pares/i, /discutir\s+com\s+(?:um\s+)?colega/i, /justifi(?:car|que).{0,60}(?:colega|pares)/i] },
    { id: "second-answer", label: "nova resposta depois da discussão", patterns: [/responder?\s+de\s+novo/i, /segunda\s+resposta/i, /nova\s+resposta/i] }
  ],
  "ensino-sob-medida": [
    { id: "advance-task", label: "tarefa respondida antes do encontro", patterns: [/tarefa.{0,80}antes\s+do\s+encontro/i, /atividade\s+antecipada/i, /respostas?\s+pr[eé]vias?/i] },
    { id: "analysis", label: "análise das respostas antes da aula", patterns: [/analis(?:ar|e).{0,100}respostas?/i, /triagem.{0,80}respostas?/i, /d[uú]vidas?.{0,80}(?:antes|previamente)/i] },
    { id: "adaptation", label: "a aula foi ajustada a partir das evidências", patterns: [/ajust(?:ar|e|ada).{0,100}(?:aula|encontro|atividade)/i, /adapt(?:ar|ada).{0,100}(?:respostas|diagn[oó]stico)/i] }
  ],
  tbl: [
    { id: "readiness", label: "preparação e teste individual de garantia", patterns: [/prepara(?:ç[aã]o|r).{0,140}teste\s+individual/i, /teste\s+individual.{0,100}garantia/i] },
    { id: "team-test", label: "o mesmo teste é respondido em equipe", patterns: [/(?:mesmo|id[eê]ntico)\s+teste.{0,100}equipe/i, /teste.{0,80}(?:grupo|equipe).{0,60}consenso/i] },
    { id: "appeal", label: "feedback ou apelação fundamentada", patterns: [/apela(?:ç[aã]o|r)/i, /feedback.{0,100}(?:respostas|equipe)/i] },
    { id: "application", label: "problema significativo com decisão e relato simultâneo", patterns: [/problema\s+signific/i, /escolha\s+espec[ií]fica/i], allPatterns: [/relato\s+simult[aâ]neo|resposta\s+simult[aâ]nea/i] }
  ],
  poe: [
    { id: "predict", label: "predição ou previsão justificada antes da observação", patterns: [/predi(?:ç[aã]o|zer)/i, /previs[aã]o.{0,80}justific/i] },
    { id: "observe", label: "observação do fenômeno com registro", patterns: [/observa(?:ç[aã]o|r).{0,100}(?:fen[oô]meno|registro|resultado)/i] },
    { id: "explain", label: "explicação compara previsão e evidência", patterns: [/explica(?:ç[aã]o|r).{0,120}(?:previs[aã]o|predi|observ)/i, /comparar.{0,100}(?:previs[aã]o|predi).{0,100}(?:resultado|observ)/i] }
  ],
  gamificacao: [
    { id: "missions", label: "missões ou desafios ligados aos objetivos", patterns: [/miss[aã]o|miss[oõ]es/i, /desafios?\s+(?:ligad|associad)/i] },
    { id: "progression", label: "progressão por níveis ou etapas", patterns: [/n[ií]veis?/i, /progress[aã]o/i, /etapas?\s+(?:progressiv|crescent)/i] },
    { id: "feedback", label: "feedback por missão, sem substituir os critérios", patterns: [/feedback\s+imediato/i, /feedback\s+(?:por|da)\s+miss/i, /crit[eé]rios?\s+de\s+aprendizagem/i] }
  ],
  "aprendizagem-jogos": [
    { id: "game", label: "há jogo com meta, regras e desafios", patterns: [/meta.{0,80}regras?.{0,80}desafios?/i, /jogo.{0,100}(?:enredo|regras|objetivo)/i] },
    { id: "decisions", label: "os estudantes tomam decisões e recebem feedback", patterns: [/decis(?:[aã]o|ões).{0,100}feedback/i, /feedback.{0,100}(?:jogador|estrat[eé]gia|decis)/i] },
    { id: "debriefing", label: "há debriefing que conecta o jogo aos conceitos", patterns: [/debriefing/i, /reflex[aã]o\s+final.{0,100}(?:jogo|conceito|aprendizagem)/i] }
  ],
  storytelling: [
    { id: "purpose", label: "a narrativa tem propósito e público definidos", patterns: [/prop[oó]sito.{0,80}p[uú]blico/i, /audi[eê]ncia.{0,100}narrativ/i] },
    { id: "research", label: "a história se apoia em pesquisa ou evidências", patterns: [/investig(?:ar|a(?:ç[aã]o)?).{0,100}(?:tema|evid[eê]ncia|fontes?)/i, /pesquisa.{0,100}narrativ/i] },
    { id: "narrative", label: "há começo, conflito/desenvolvimento e desfecho", patterns: [/come(?:ç|c)o.{0,100}(?:conflito|meio|desenvolvimento).{0,100}(?:fim|desfecho)/i] },
    { id: "sharing", label: "a produção é compartilhada, recebe feedback e gera reflexão", patterns: [/compartilh(?:ar|ada).{0,100}feedback/i, /reflex[aã]o.{0,100}(?:processo|narrativa)/i] }
  ],
  "escape-room": [
    { id: "mission", label: "missão narrativa com regras e tempo", patterns: [/miss[aã]o.{0,100}(?:regras|tempo)/i, /narrativa.{0,100}(?:tempo|cron[oô]metro)/i] },
    { id: "puzzles", label: "enigmas encadeados aplicam o conteúdo", patterns: [/enigmas?\s+encadead/i, /enigmas?.{0,120}(?:conte[uú]do|objetivo)/i] },
    { id: "hints", label: "há pistas graduadas e teste prévio", patterns: [/pistas?\s+graduad/i, /sistema\s+de\s+pistas/i], allPatterns: [/teste\s+pr[eé]vio|testar\s+antes/i] },
    { id: "debriefing", label: "há debriefing após a experiência", patterns: [/debriefing/i, /reflex[aã]o.{0,80}(?:ap[oó]s|final).{0,80}(?:escape|enigma|experi[eê]ncia)/i] }
  ],
  pesquisa: [
    { id: "question", label: "pergunta investigável e plano de investigação", patterns: [/pergunta\s+investig[aá]vel/i, /problema\s+de\s+pesquisa/i], allPatterns: [/plano\s+de\s+(?:pesquisa|investiga)/i] },
    { id: "sources", label: "fontes ou dados são avaliados e organizados", patterns: [/(?:fontes|dados).{0,100}(?:confiabilidade|crit[eé]rios|organiza)/i] },
    { id: "analysis", label: "evidências sustentam análise e conclusão", patterns: [/an[aá]lise.{0,100}(?:evid[eê]ncia|dados)/i, /conclus[aã]o.{0,100}(?:evid[eê]ncia|dados)/i] },
    { id: "communication", label: "resultados são comunicados com referências", patterns: [/comunicar.{0,100}(?:resultados|conclus)/i, /apresenta(?:ç[aã]o|r).{0,100}refer[eê]ncias/i] }
  ],
  wac: [
    { id: "purpose", label: "propósito, audiência e gênero estão definidos", patterns: [/prop[oó]sito.{0,80}(?:audi[eê]ncia|p[uú]blico).{0,80}g[eê]nero/i, /g[eê]nero.{0,100}(?:audi[eê]ncia|destinat[aá]rio)/i] },
    { id: "draft", label: "há rascunho e feedback utilizável", patterns: [/rascunho.{0,100}feedback/i, /feedback.{0,100}rascunho/i] },
    { id: "revision", label: "o estudante revisa e produz nova versão", patterns: [/revis[aã]o.{0,100}(?:vers[aã]o|texto)/i, /nova\s+vers[aã]o/i] }
  ],
  "juri-simulado": [
    { id: "roles", label: "papéis e posições em disputa", patterns: [/defesa.{0,40}acusa(?:ç[aã]o|r)/i, /pap[eé]is?.{0,80}(?:jurad|debate)/i, /posi(?:ç[aã]o|ções)\s+em\s+disputa/i] },
    { id: "evidence", label: "argumentos fundamentados em evidências", patterns: [/argumentos?\s+fundamentad/i, /evid[eê]ncias?\s+(?:para|em|que)/i, /cobrar\s+evid[eê]ncia/i] },
    { id: "rounds", label: "rodadas e fechamento mediado", patterns: [/rodadas?/i, /r[eé]plica|tr[eé]plica/i, /fechamento.{0,60}(?:professor|mediador|objetivos)/i] }
  ],
  "rotacao-estacoes": [
    { id: "stations", label: "três ou mais estações/trilhas identificáveis", test: (body) => (body.match(/esta(?:ç[aã]o|ções)|trilhas?/gi) || []).length >= 3 },
    { id: "station-products", label: "tarefa, tempo ou produto definido em cada estação", patterns: [/tempo\s+(?:sugerido|previsto)/i, /produto\s+(?:de|da)\s+cada/i, /tarefa\s+(?:de|em|por)\s+cada/i] },
    { id: "integration", label: "síntese final que integra as estações", patterns: [/s[ií]ntese.{0,80}integra/i, /integra(?:r|ç[aã]o).{0,80}esta(?:ç[aã]o|ções)/i, /fechamento\s+integrador/i] }
  ],
  "laboratorio-rotacional": [
    { id: "two-spaces", label: "sala e laboratório/ambiente tecnológico estão definidos", patterns: [/sala.{0,120}laborat[oó]rio/i, /laborat[oó]rio.{0,120}sala/i, /dois\s+ambientes/i] },
    { id: "rotation-time", label: "a rotação e o tempo de cada ambiente estão definidos", patterns: [/rota(?:ç[aã]o|cion).{0,100}(?:minutos|tempo|hor[aá]rio)/i, /(?:minutos|tempo).{0,100}laborat[oó]rio/i] },
    { id: "online-purpose", label: "a atividade on-line possui finalidade pedagógica", patterns: [/on-?line.{0,120}(?:investig|pratic|produ|analis|dados)/i, /laborat[oó]rio.{0,120}(?:investig|pratic|produ|analis)/i] },
    { id: "connection", label: "a produção do laboratório se conecta à etapa em sala", patterns: [/laborat[oó]rio.{0,160}(?:sala|discuss|retom|apresent)/i, /(?:sala|discuss|retom).{0,160}laborat[oó]rio/i] },
    { id: "fallback", label: "há alternativa para falha de acesso ou equipamento", patterns: [/plano\s+b/i, /sem\s+(?:internet|acesso|equipamento)/i, /alternativa.{0,80}(?:acesso|equipamento|laborat[oó]rio)/i] }
  ],
  "rotacao-individual": [
    { id: "diagnostic", label: "há diagnóstico ou evidência para definir o percurso", patterns: [/diagn[oó]stic/i, /evid[eê]ncia.{0,100}(?:agenda|percurso|necessidade)/i, /resultado.{0,100}(?:anterior|agenda|percurso)/i] },
    { id: "individual-path", label: "cada estudante recebe agenda ou percurso individual", patterns: [/agenda\s+(?:pessoal|individual|personalizada)/i, /percurso\s+(?:individual|personalizado)/i, /roteiro\s+individual/i] },
    { id: "not-all", label: "nem todos precisam realizar as mesmas atividades", patterns: [/n[aã]o\s+(?:precisa|devem).{0,80}(?:todas|mesmas)/i, /nem\s+todos.{0,80}(?:atividades|esta(?:ç[aã]o|ções))/i] },
    { id: "tutoring", label: "há tutoria e atualização do percurso", patterns: [/tutoria/i, /acompanhar.{0,100}(?:progresso|percurso)/i, /atualizar.{0,80}(?:agenda|percurso)/i] }
  ],
  flex: [
    { id: "online-core", label: "a aprendizagem on-line é o eixo principal", patterns: [/on-?line.{0,80}(?:eixo|central|principal)/i, /plano\s+de\s+estudos\s+on-?line/i] },
    { id: "flexibility", label: "há flexibilidade real de ritmo ou caminho", patterns: [/ritmo\s+(?:pr[oó]prio|flex[ií]vel|individual)/i, /caminho\s+flex/i, /escolh(?:a|er).{0,100}(?:atividade|percurso|aprofundamento)/i] },
    { id: "tutoring", label: "o professor oferece tutoria e intervenções sob demanda", patterns: [/tutoria/i, /interven(?:ç[aã]o|ções).{0,100}(?:demanda|necessidade)/i, /pequenos\s+grupos/i] },
    { id: "data", label: "dados do percurso orientam a personalização", patterns: [/dados.{0,100}(?:personaliz|apoio|interven)/i, /progresso.{0,100}(?:apoio|pr[oó]ximos passos)/i] }
  ],
  "a-la-carte": [
    { id: "online-discipline", label: "uma disciplina ou componente ocorre integralmente on-line", patterns: [/disciplina.{0,100}(?:inteiramente|integralmente|100%).{0,40}on-?line/i, /componente.{0,100}integralmente\s+on-?line/i] },
    { id: "online-support", label: "ambiente, tutoria e avaliação on-line estão definidos", patterns: [/tutoria/i], allPatterns: [/ambiente\s+virtual|on-?line/i, /avalia/i] },
    { id: "articulation", label: "o componente on-line se articula ao percurso presencial", patterns: [/articul.{0,100}presencial/i, /demais.{0,80}(?:disciplina|experi[eê]ncia).{0,80}presencial/i] }
  ],
  "virtual-aprimorado": [
    { id: "online-majority", label: "o percurso é predominantemente on-line", patterns: [/predominantemente\s+on-?line/i, /maior\s+parte.{0,100}on-?line/i] },
    { id: "periodic-meetings", label: "há encontros presenciais periódicos com finalidade definida", patterns: [/encontros?\s+presenciais?\s+peri[oó]dic/i, /presencial.{0,80}(?:periodic|semanal|mensal)/i] },
    { id: "continuous-support", label: "o acompanhamento continua entre os encontros", patterns: [/acompanhamento\s+cont[ií]nuo/i, /entre\s+os\s+encontros.{0,80}(?:tutoria|acompanh)/i] }
  ],
  "design-thinking": [
    { id: "empathy-definition", label: "empatia e definição do desafio", patterns: [/empatia/i, /mapa\s+de\s+empatia/i], allPatterns: [/defini(?:ç[aã]o|r)/i, /como\s+poder[ií]amos/i] },
    { id: "ideation-prototype", label: "ideação e construção de protótipo", patterns: [/idea(?:ç[aã]o|r)/i], allPatterns: [/prot[oó]tip/i] },
    { id: "test", label: "teste ou validação do protótipo com o usuário", patterns: [/test(?:e|ar|ando).{0,70}(?:prot[oó]tip|usu[aá]ri)/i, /validar.{0,70}(?:prot[oó]tip|usu[aá]ri)/i, /feedback\s+d[eo]\s+usu[aá]ri/i] }
  ]
});

function validationBody(plan = {}) {
  const source = {
    welcome: plan.welcome,
    sections: plan.contentSections,
    activities: plan.activities,
    checks: plan.formativeChecks,
    methodology: plan.activeMethodology,
    reflection: plan.reflection,
    assessment: plan.assessment
  };
  return JSON.stringify(source).replace(/[{}[\]"_:,]+/g, " ").replace(/\\n/g, " ");
}

function rulePass(rule, body) {
  if (typeof rule.test === "function" && rule.test(body)) return true;
  const any = !rule.patterns?.length || rule.patterns.some((pattern) => pattern.test(body));
  const all = !rule.allPatterns?.length || rule.allPatterns.every((pattern) => pattern.test(body));
  return any && all;
}

// Validação determinística da aplicação da metodologia. Não tenta decidir se a aula é "boa":
// confere se os componentes indispensáveis do método aparecem na atividade gerada e explica o que falta.
export function validateActiveMethodology(input = {}, index = 0, plan = {}) {
  const requested = methodForWeek(input, index);
  const declared = object(plan.activeMethodology);
  const declaredId = text(declared.id);
  const effectiveId = requested.id === "auto" ? declaredId : requested.id;
  if (requested.id === "nenhuma") return { applicable: false, status: "not-applicable", pass: true, methodId: "nenhuma", methodLabel: "Nenhuma específica", criteria: [], issues: [] };
  const activities = Array.isArray(plan.activities) ? plan.activities : [];
  const common = [
    { id: "activities", label: "há pelo menos uma atividade produzida", pass: activities.length > 0 },
    { id: "identification", label: "a metodologia aplicada está identificada", pass: Boolean(text(declared.label) && (effectiveId || requested.method)) },
    { id: "rationale", label: "a escolha está justificada pelos objetivos", pass: text(declared.rationale).length >= 20 },
    { id: "application", label: "a forma de aplicação está descrita", pass: text(declared.howApplied).length >= 30 }
  ];
  const rules = VALIDATION_RULES[effectiveId] || [];
  const body = validationBody(plan);
  const specific = rules.map((rule) => ({ id: rule.id, label: rule.label, pass: rulePass(rule, body) }));
  if (requested.id === "auto" && !effectiveId) specific.unshift({ id: "auto-choice", label: "a IA registrou qual metodologia escolheu", pass: false });
  if (effectiveId && !VALIDATION_RULES[effectiveId]) specific.unshift({ id: "known-method", label: "a metodologia escolhida pertence ao catálogo validado", pass: false });
  const criteria = [...common, ...specific];
  const issues = criteria.filter((criterion) => !criterion.pass).map((criterion) => criterion.label);
  return {
    applicable: true,
    status: issues.length ? (criteria.filter((criterion) => criterion.pass).length >= Math.ceil(criteria.length / 2) ? "review" : "incomplete") : "ready",
    pass: issues.length === 0,
    methodId: effectiveId || requested.id,
    methodLabel: text(declared.label) || requested.method?.label || requested.label,
    criteria,
    issues
  };
}

export function normalizeApproach(value) {
  const raw = text(value).toLowerCase();
  return PEDAGOGICAL_APPROACHES.some((approach) => approach.id === raw) ? raw : "atual";
}

export function normalizeMethodologyPlan(raw = {}, weeks = 1) {
  const source = object(raw);
  const defaultMethod = validChoice(text(source.default)) ? text(source.default) : "nenhuma";
  const entries = Array.isArray(source.weeks) ? source.weeks : [];
  const byWeek = new Map();
  entries.forEach((entry) => {
    const weekNumber = Number(object(entry).weekNumber || object(entry).week);
    const method = text(object(entry).method);
    if (Number.isInteger(weekNumber) && weekNumber >= 1 && weekNumber <= weeks && method && validChoice(method)) byWeek.set(weekNumber, method);
  });
  return { default: defaultMethod, weeks: [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([weekNumber, method]) => ({ weekNumber, method })) };
}

// Metodologia em vigor numa semana: a escolha específica da semana ou, se não houver, o padrão do curso.
export function methodForWeek(input = {}, index = 0) {
  const plan = object(input.methodologyPlan);
  const specific = (Array.isArray(plan.weeks) ? plan.weeks : []).find((entry) => Number(entry.weekNumber) === index + 1);
  const id = text(specific?.method || plan.default || "nenhuma");
  if (id === "auto") return { id: "auto", label: "A IA escolhe e justifica", method: null };
  const method = methodById(id);
  return method ? { id: method.id, label: method.label, method } : { id: "nenhuma", label: "Nenhuma específica", method: null };
}

function validatedCatalogLabels() { return VALIDATED_METHOD_REFERENCE_PROFILES.map((item) => item.label).join("; "); }

export function assertMethodologyReference(input = {}, index = 0) {
  if (!input.requireValidatedMethodologyReferences) return;
  const choice = methodForWeek(input, index);
  if (["nenhuma", "auto"].includes(choice.id)) return;
  const policy = activeMethodReferencePolicy(choice.id);
  if (policy.allowed) return;
  const error = new Error(`A metodologia “${choice.label}” ainda não possui referencial institucional cadastrado. Selecione outra metodologia ou peça ao administrador para incluir uma fonte validada.`);
  error.code = "METHODOLOGY_REFERENCE_MISSING";
  throw error;
}

export function isNewApproach(input = {}) {
  return normalizeApproach(input.pedagogicalApproach) === "nova";
}

// ---------- Taxonomia de Bloom revisada ----------
// Níveis, verbos e classificação ficam em bloom.js (também usado no navegador).
import { BLOOM_LEVELS, VAGUE_VERBS, objectiveVerb, bloomLevel } from "./bloom.js";
export { BLOOM_LEVELS, VAGUE_VERBS, objectiveVerb, bloomLevel };

export function bloomProfile(objectives = []) {
  const list = (Array.isArray(objectives) ? objectives : []).map(text).filter(Boolean);
  const items = list.map(auditBloomObjective);
  const vague = items.filter((item) => item.level === "vago");
  const unknown = items.filter((item) => item.verb && item.level == null);
  const incomplete = items.filter((item) => !item.complete);
  const higher = items.filter((item) => ["aplicar", "analisar", "avaliar", "criar"].includes(item.level));
  return { items, vague, unknown, incomplete, higher };
}

// ---------- Blocos de prompt ----------

const MAYER_TEXT = `(Estes princípios valem sem mudar a voz descrita no guia: prosa corrida, de professor conversando com a turma.)
- Pré-treino: defina cada termo técnico na primeira vez que ele aparece, em linguagem simples, antes de usá-lo num raciocínio.
- Sinalização discreta: o leitor precisa saber, logo no começo de cada seção, que pergunta ela responde. Diga isso com naturalidade, não com fórmula ("Nesta seção veremos…" é proibido).
- Coerência: corte o que não serve a nenhum objetivo; o tamanho vem de desenvolvimento (caso, exemplo, contraexemplo), nunca de enfeite ou repetição.
- Contiguidade: figura, tabela ou recurso 🔎 fica junto do parágrafo que o explica.
- Personalização: fale com o estudante (você, vocês, a gente), como numa boa aula.`;

// Voz humana: marcas típicas de texto gerado por IA em português, que o professor percebe na hora.
export const AI_CLICHES = Object.freeze([
  "além disso", "nesse sentido", "dessa forma", "desse modo", "vale ressaltar", "vale destacar", "é importante ressaltar", "é importante destacar",
  "é fundamental", "é crucial", "é essencial", "em resumo", "em suma", "em síntese,", "neste contexto", "nesse contexto", "no cenário atual",
  "nos dias de hoje", "cada vez mais", "desempenha um papel", "papel crucial", "papel fundamental", "não se trata apenas", "mais do que nunca",
  "no mundo atual", "em um mundo", "por fim, mas não menos importante", "mergulhar", "jornada", "desbravar", "potencializar", "alavancar",
  "nesta seção, veremos", "nesta seção veremos", "como vimos anteriormente", "imagine que você", "a chave para", "ferramenta poderosa"
]);

export function aiClicheReport(textValue = "") {
  const plain = String(textValue || "").toLowerCase();
  const words = plain.split(/\s+/).filter(Boolean).length || 1;
  const hits = AI_CLICHES.map((term) => ({ term, count: plain.split(term).length - 1 })).filter((item) => item.count > 0).sort((a, b) => b.count - a.count);
  const total = hits.reduce((sum, item) => sum + item.count, 0);
  return { total, perThousand: Math.round((total / words) * 10000) / 10, hits };
}

const HUMAN_VOICE = `VOZ HUMANA (o texto precisa soar como um professor de verdade escrevendo, não como IA)
- Proibido usar: ${AI_CLICHES.map((term) => `"${term}"`).join(", ")}. Encadeie as ideias pelo próprio raciocínio (por isso, só que, aí está o problema, repare que), não por conectivos de redação.
- Abra cada seção com algo concreto (uma situação de sala de aula ou de trabalho, um erro comum, um dado, uma pergunta que o estudante faria), não com definição de dicionário.
- Varie de verdade o ritmo: frases curtas ao lado de períodos longos; nem todo parágrafo termina com uma "lição" ou moral.
- Nada de trios automáticos ("rápido, eficiente e seguro"), de "não é só X, é Y" nem de dois-pontos dramáticos em série. Negrito só para termo novo e para a ideia que o estudante precisa guardar, no máximo uma por seção.
- Use exemplos com cara de Brasil e da área do curso (instituições, sistemas, situações reais do público do briefing). Não invente histórias pessoais do professor ("certa vez, em minha turma…"): use situações típicas ("é comum, em sala, alguém perguntar…").
- Antes de entregar, releia como se fosse o estudante: se uma frase poderia estar em qualquer texto sobre qualquer assunto, reescreva-a com o assunto desta aula.`;

function methodText(choice) {
  if (choice.id === "auto") return `METODOLOGIA ATIVA DESTA SEMANA: a IA escolhe (ela será definida junto com as atividades). Escreva o texto de modo que prepare o estudante para uma atividade de aplicação, análise ou criação, e não só para lembrar.`;
  if (!choice.method) return "";
  const reference = activeMethodReferenceBlock(choice.id);
  return `${reference ? `${reference}\n\n` : ""}METODOLOGIA ATIVA DESTA SEMANA: ${choice.method.label}
${choice.method.text}
As atividades e a mediação da semana serão montadas depois, a partir deste texto, seguindo a mesma metodologia.`;
}

// Bloco acrescentado ao prompt de redação (texto do estudante).
export function writerMethodologyBlock(input = {}, index = 0) {
  assertMethodologyReference(input, index);
  const choice = methodForWeek(input, index);
  const parts = [];
  if (usesValidatedBloomReference(input)) parts.push(bloomReferenceBlock());
  if (isNewApproach(input)) {
    parts.push(`ABORDAGEM PEDAGÓGICA (planejamento reverso, objetivos observáveis e aprendizagem multimídia)
- Planeje de trás para frente: antes de escrever, defina para si qual evidência o estudante vai produzir para cada objetivo (a avaliação e as atividades desta semana serão geradas depois, a partir deste texto, e vão cobrar exatamente isso). Toda seção precisa preparar para pelo menos uma dessas evidências; se uma seção não serve a nenhum objetivo, ela não entra.
- Objetivos: mantenha a intenção dos objetivos recebidos, mas, se algum começar com verbo vago (compreender, conhecer, entender, saber, aprender, perceber, refletir), reescreva-o com um verbo observável equivalente (explicar, comparar, aplicar, analisar, avaliar, propor…). Garanta que pelo menos um objetivo da semana esteja em nível de aplicação ou acima (aplicar, analisar, avaliar ou criar).
- Na síntese, diga com clareza o que o estudante deve ser capaz de FAZER ao final da semana, ligado aos objetivos.
PRINCÍPIOS DE APRENDIZAGEM MULTIMÍDIA NO TEXTO
${MAYER_TEXT}

${HUMAN_VOICE}`);
  }
  const method = methodText(choice);
  if (method) parts.push(method);
  return parts.join("\n\n");
}

// Bloco acrescentado ao prompt das peças derivadas (avaliação, atividades, mediação, explicações).
export function derivativesMethodologyBlock(input = {}, index = 0, wants = {}) {
  assertMethodologyReference(input, index);
  const choice = methodForWeek(input, index);
  const parts = [];
  if (usesValidatedBloomReference(input) && (wants.assessment || wants.activities)) parts.push(bloomReferenceBlock({ compact: true }));
  if (isNewApproach(input) && (wants.assessment || wants.activities)) {
    parts.push(`ALINHAMENTO CONSTRUTIVO (abordagem nova)
- Cada objetivo precisa de pelo menos uma atividade e de pelo menos uma questão que exijam o MESMO nível de pensamento do verbo do objetivo: se o objetivo pede "analisar", a questão não pode pedir só "lembrar"; se pede "propor", a atividade precisa gerar uma proposta.
- Distribua as questões entre os níveis dos objetivos (Bloom revisada): não mais que duas questões só de memorização.
- Os critérios das atividades descrevem o que se observa na produção do estudante, com os verbos dos objetivos.`);
  }
  if (wants.activities) {
    if (choice.method) {
      const reference = activeMethodReferenceBlock(choice.id, { includeTemplate: true });
      parts.push(`${reference ? `${reference}\n\n` : ""}METODOLOGIA ATIVA DESTA SEMANA: ${choice.method.label}
ATIVIDADES: ${choice.method.activities}
Inclua no JSON "activeMethodology": { "id": "${choice.method.id}", "label": "${choice.method.label}", "rationale": "por que ela serve aos objetivos desta semana, em 1 ou 2 frases", "howApplied": "como as atividades desta semana aplicam a metodologia, em 2 a 4 frases", "modalityNote": "adaptação para EaD ou para a webprática, se necessária" }.`);
    } else if (choice.id === "auto") {
      const catalog = input.requireValidatedMethodologyReferences ? validatedCatalogLabels() : ACTIVE_METHODS.map((method) => method.label).join("; ");
      parts.push(`METODOLOGIA ATIVA DESTA SEMANA: escolha UMA destas, a que melhor servir aos objetivos e ao texto: ${catalog}. Estruture as atividades por ela.
Inclua no JSON "activeMethodology": { "id": "identificador curto", "label": "nome da metodologia escolhida", "rationale": "por que ela serve aos objetivos desta semana, em 1 ou 2 frases", "howApplied": "como as atividades aplicam a metodologia, em 2 a 4 frases", "modalityNote": "adaptação para EaD ou para a webprática, se necessária" }.`);
    }
  }
  if ((wants.mediation || wants.explain) && choice.method) {
    parts.push(`MEDIAÇÃO DA METODOLOGIA (${choice.method.label}): ${choice.method.mediation}`);
  }
  return parts.join("\n\n");
}

// Bloco para roteiros de vídeo e slides (abordagem nova).
export function productionMethodologyBlock(input = {}) {
  if (!isNewApproach(input)) return "";
  return `PRINCÍPIOS DE APRENDIZAGEM MULTIMÍDIA (obrigatórios)
- Redundância: a narração explica; o slide não repete a narração palavra por palavra. Não leia os tópicos do slide.
- Modalidade: prefira imagem/diagrama + narração a texto + narração.
- Segmentação: a cada 3 ou 4 minutos de fala, uma pausa explícita ("antes de seguir, pense em…") ou uma pergunta de verificação; o vídeo deve poder ser cortado nesses pontos.
- Sinalização: anuncie no início o que será visto e marque cada mudança de parte.
- Coerência: nada de efeito, música ou imagem decorativa que não ajude a entender.
- Personalização: fale com o estudante, em primeira e segunda pessoa.
- Voz humana: nada de "além disso", "vale ressaltar", "é fundamental", "nesse contexto", "em suma", "no cenário atual", "jornada", "mergulhar"; fale como o professor falaria gravando para a turma dele.`;
}

// ---------- Webpráticas (sessões síncronas) ----------

// Metodologia de uma webprática: "semana" (ou vazio) herda a metodologia da semana em que ela acontece.
export function methodForPractice(practice = {}, input = {}, index = 0) {
  const id = text(object(practice).methodology);
  if (!id || id === "semana") return { ...methodForWeek(input, index), inherited: true };
  if (id === "auto") return { id: "auto", label: "A IA escolhe e justifica", method: null, inherited: false };
  const method = methodById(id);
  return method ? { id: method.id, label: method.label, method, inherited: false } : { id: "nenhuma", label: "Nenhuma específica", method: null, inherited: false };
}

// Bloco acrescentado às regras da webprática: uma orientação por sessão agendada.
export function webPracticeMethodologyBlock(input = {}, index = 0, practices = []) {
  const lines = (Array.isArray(practices) ? practices : []).map((practice, position) => {
    const choice = methodForPractice(practice, input, index);
    const name = text(practice.title || practice.sessionTitle) || `Webprática ${position + 1}`;
    if (choice.id === "nenhuma") return "";
    if (choice.id === "auto") return `- "${name}": escolha UMA destas metodologias, a que melhor servir ao objetivo da sessão: ${ACTIVE_METHODS.map((method) => method.label).join("; ")}. Organize os passos (steps) pelas etapas dela.`;
    return `- "${name}": ${choice.method.label}. ${choice.method.activities} Como é uma sessão ao vivo, use a versão síncrona completa da metodologia (sem as adaptações para fórum) e faça os passos (steps), com seus minutos, seguirem as etapas dela. Mediação: ${choice.method.mediation}`;
  }).filter(Boolean);
  if (!lines.length) return "";
  return `METODOLOGIA ATIVA DAS WEBPRÁTICAS (sessões síncronas)
${lines.join("\n")}
Em cada projeto com metodologia, inclua "activeMethodology": { "label": "nome da metodologia", "rationale": "por que ela serve ao objetivo da sessão, em 1 ou 2 frases", "howApplied": "como os passos da sessão aplicam a metodologia, em 2 a 4 frases" }.`;
}

// Regra extra para "Preencher vazios com IA" (abordagem nova): objetivos pela Taxonomia de Bloom revisada.
export function briefingObjectivesRule(input = {}) {
  if (!usesValidatedBloomReference(input)) return "";
  return `
${bloomReferenceBlock()}

OBJETIVOS PELA TAXONOMIA DE BLOOM REVISADA (obrigatório nesta abordagem):
- Cada objetivo começa com UM verbo observável no infinitivo, seguido do objeto e do contexto (ex.: "Comparar SIGAA e SUAP quanto a ... no contexto de ...").
- Proibido começar com verbo vago: compreender, conhecer, entender, saber, aprender, perceber, refletir, familiarizar-se.
- Faça os objetivos progredirem ao longo do curso, dos níveis mais simples aos mais complexos: no máximo um objetivo de lembrar/entender (identificar, explicar, descrever…); os demais em aplicar (aplicar, resolver, utilizar…), analisar (comparar, analisar, diferenciar…), avaliar (avaliar, justificar, argumentar…) e criar (elaborar, propor, planejar…). Pelo menos um objetivo deve ser de avaliar ou criar.
- Ajuste o teto ao nível da turma: pós-graduação e superior chegam a avaliar/criar; FIC e cursos introdutórios podem parar em aplicar/analisar.
- Considere também o tipo de conhecimento mobilizado: factual, conceitual, procedimental ou metacognitivo.
- Não escreva o nome do nível no texto do objetivo; a ação e o objeto devem demonstrá-lo.`;
}

// ---------- Guia de aplicação da metodologia (Material de Mediação) ----------

export const METHODOLOGY_GUIDE_SPEC = `  "teacherGuide": {
    "methodologyGuide": {
      "method": "nome da metodologia",
      "whatItIs": "o que é, em 2 ou 3 frases simples, para quem nunca usou",
      "whyHere": "por que ela serve aos objetivos DESTA semana, em 2 frases",
      "beforeTheWeek": ["o que o professor prepara antes de abrir a semana (materiais, avisos, ajustes no Moodle)"],
      "phases": [ { "name": "nome da etapa (ex.: Antes do encontro: estudo prévio)", "when": "quando, no calendário da semana (ex.: dias 1 a 3)", "goal": "para que serve esta etapa", "teacherActions": ["o que o professor faz"], "studentActions": ["o que o estudante faz"], "materials": ["o que é usado: seção do texto, vídeo, quiz, fórum, webprática"] } ],
      "studentInstructions": "texto pronto para postar no Moodle explicando ao estudante como a semana vai funcionar com esta metodologia: o que fazer, em que ordem e por quê (de 80 a 150 palavras, tom acolhedor, sem jargão)",
      "monitoring": [ { "indicator": "o que acompanhar (ex.: quantos fizeram o quiz de verificação)", "howToCheck": "onde e como ver isso (relatório do Moodle, fórum, respostas)", "when": "quando olhar", "ifLow": "o que fazer se estiver abaixo do esperado" } ],
      "successSignals": ["sinal observável de que a metodologia está funcionando"],
      "warningSignals": [ { "signal": "sinal de que não está funcionando", "action": "o que fazer, concretamente" } ],
      "assessment": { "howToAssess": "como avaliar se os estudantes aprenderam com esta metodologia (o que conta, o que não conta)", "criteria": [ { "criterion": "critério observável", "evidence": "evidência na produção do estudante" } ] },
      "pitfalls": ["erro comum de quem aplica esta metodologia pela primeira vez, e como evitar"],
      "adaptations": { "ead": "como fica 100% a distância e assíncrono", "synchronous": "como aproveitar um encontro ao vivo ou a webprática", "largeClass": "ajuste para turma grande ou pouco participativa" }
    }
  }`;

export function methodologyGuideRules(input = {}, index = 0, plan = {}) {
  const choice = methodForWeek(input, index);
  const declared = plan.activeMethodology && typeof plan.activeMethodology === "object" ? plan.activeMethodology : {};
  const method = choice.method || ACTIVE_METHODS.find((item) => item.label === text(declared.label) || item.id === text(declared.id)) || null;
  const label = method ? method.label : text(declared.label) || "a metodologia ativa escolhida para a semana";
  const activities = (Array.isArray(plan.activities) ? plan.activities : []).slice(0, 6).map((activity) => ({ titulo: text(activity.title), tipo: text(activity.type), instrucoes: text(activity.instructions).slice(0, 500), evidencia: text(activity.evidence) }));
  const reference = activeMethodReferenceBlock(method?.id || choice.id, { includeTemplate: true });
  return `${reference ? `${reference}\n\n` : ""}REGRAS DO GUIA DE APLICAÇÃO DA METODOLOGIA
- Metodologia desta semana: ${label}.${declared.howApplied ? ` Como as atividades já geradas a aplicam: ${text(declared.howApplied)}` : ""}${method ? `\n- Referência da metodologia: ${method.text} ${method.activities} ${method.mediation}` : ""}
- O leitor é o professor que talvez nunca tenha usado esta metodologia: o guia precisa dizer COMO aplicar, QUANDO cada etapa acontece, DE QUE JEITO conduzir e COMO saber se está funcionando. Seja concreto e prático; nada de definição genérica de manual.
- Amarre tudo ao que esta semana já tem: as seções do texto, as atividades abaixo, o quiz, o fórum, os vídeos e a webprática, se houver. Use os nomes reais delas. Não invente atividade nova sem dizer que é sugestão opcional.
- "phases": de 3 a 5 etapas em ordem cronológica, cobrindo antes, durante e depois. Cada uma com ações do professor e do estudante.
- "monitoring": de 3 a 5 indicadores que o professor consegue de fato ver no Moodle ou na turma. "warningSignals": de 3 a 5, cada um com ação concreta.
- Escreva em português do Brasil, de colega para colega, sem jargão vazio.
${activities.length ? `ATIVIDADES JÁ GERADAS PARA A SEMANA:\n${JSON.stringify(activities, null, 2)}` : ""}`;
}

// Quando a política estrita está ativa, o ClassAuthor só aplica uma metodologia que
// possua referencial administrativo. A opção "nenhuma" continua válida.
export function methodologyReferencePolicy(input = {}, index = 0) {
  const choice = methodForWeek(input, index);
  if (choice.id === "nenhuma") return { allowed: true, reason: "sem-metodologia-especifica", choice };
  if (choice.id === "auto") return { allowed: false, reason: "escolha-automatica-exige-catalogo-validado", choice };
  return { ...activeMethodReferencePolicy(choice.id), choice };
}
