// Mapa de alinhamento do curso: cruza, semana a semana, os objetivos com as atividades, as
// evidências, as questões da avaliação e a carga horária, e aponta as lacunas.
//
// Código puro (sem Node): public/alignment-map.js é cópia idêntica deste arquivo e roda no navegador.
// Só conta como vínculo o que a IA (ou o professor) declarou. Quando o app preencheu a ligação por
// rodízio, só para o campo não ficar vazio (marcas *Inferred de pedagogy.js), a ligação aparece como
// "estimada" e a lacuna continua aberta. Semanas geradas antes dessas marcas existirem não as têm:
// nelas, tudo o que está preenchido é tratado como declarado.
import { bloomLevel, BLOOM_LEVELS } from "./bloom.js";

const text = (value) => String(value ?? "").trim();
const asList = (value) => Array.isArray(value) ? value : (text(value) ? text(value).split(/\r?\n+/) : []);
const itemText = (item) => typeof item === "object" && item ? text(item.text || item.title || item.description || item.objective || item.id) : text(item);

export const LOAD_TOLERANCE = 0.15; // até 15% de diferença entre a carga calculada e a meta

const STOPWORDS = new Set(["para", "como", "com", "sem", "sobre", "entre", "pelo", "pela", "pelos", "pelas", "uma", "umas", "uns", "dos", "das", "nos", "nas", "que", "seu", "sua", "seus", "suas", "este", "esta", "estes", "estas", "esse", "essa", "isso", "aos", "numa", "num", "ser", "capaz", "estudante", "aluno", "aluna", "final", "curso", "disciplina", "unidade", "semana", "aula", "partir", "diferentes", "principais", "basicos", "basico", "adequados", "adequado"]);

function stems(value) {
  return [...new Set(text(value).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((word) => word.length >= 4 && !STOPWORDS.has(word)).map((word) => word.slice(0, 5)))];
}

const normalized = (value) => text(value).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

function sameLink(a, b) {
  return normalized(a) !== "" && normalized(a) === normalized(b);
}

export function buildAlignmentMap({ input = {}, weeks = [], workload = null } = {}) {
  const issues = [];
  const add = (severity, code, weekNumber, message) => issues.push({ severity, code, weekNumber, text: message });
  const loadWeeks = Array.isArray(workload?.weeks) ? workload.weeks : [];

  const mapWeeks = (Array.isArray(weeks) ? weeks : []).map((lesson, index) => {
    const weekNumber = index + 1;
    if (!lesson?.lessonPlan) return { weekNumber, theme: "", objectives: [], activities: [], questions: [], orphanActivities: [], orphanQuestions: [], bloomCounts: Object.fromEntries(BLOOM_LEVELS.map((level) => [level, 0])), load: { calculated: 0, target: 0, status: "sem-dado" }, generated: false };
    const plan = lesson.lessonPlan;
    const objectives = asList(plan.learningObjectives || plan.objectives).map(itemText).filter(Boolean);
    const activities = (Array.isArray(plan.activities) ? plan.activities : []).map((activity, position) => ({
      id: text(activity?.id, `activity-${position + 1}`) || `activity-${position + 1}`,
      title: text(activity?.title) || `Atividade ${position + 1}`,
      type: text(activity?.type),
      evidence: text(activity?.evidence),
      minutes: Number(activity?.durationMinutes) || 0
    }));
    const questions = (Array.isArray(plan.assessment?.questions) ? plan.assessment.questions : []).map((question, position) => ({
      id: text(question?.id) || `question-${position + 1}`,
      number: position + 1,
      title: text(question?.q || question?.question),
      objective: text(question?.objective)
    }));
    const matrix = Array.isArray(plan.alignmentMatrix) ? plan.alignmentMatrix : [];
    const usedActivities = new Set();
    const usedQuestions = new Set();

    const rows = objectives.map((objective, position) => {
      const row = matrix[position] && typeof matrix[position] === "object" ? matrix[position] : {};
      const level = bloomLevel(objective);
      const refs = (value) => (Array.isArray(value) ? value : []).map((item) => text(typeof item === "object" && item ? item.id || item.title : item)).filter(Boolean);
      const activityRefs = refs(row.activities);
      const questionRefs = refs(row.assessmentQuestions);
      const linkedActivities = [];
      for (const ref of activityRefs) {
        const found = activities.find((activity) => activity.id === ref || sameLink(activity.title, ref));
        if (found) linkedActivities.push({ id: found.id, title: found.title, estimated: row.activitiesInferred === true });
      }
      const linkedQuestions = [];
      for (const ref of questionRefs) {
        const found = questions.find((question) => question.id === ref);
        if (found) linkedQuestions.push({ id: found.id, number: found.number, estimated: row.questionsInferred === true });
      }
      // Uma questão também pode declarar, no próprio campo "objective", a que objetivo serve.
      for (const question of questions) {
        if (question.objective && (sameLink(question.objective, objective) || (normalized(objective).includes(normalized(question.objective)) && normalized(question.objective).length > 20))) {
          if (!linkedQuestions.some((item) => item.id === question.id)) linkedQuestions.push({ id: question.id, number: question.number, estimated: false });
        }
      }
      linkedActivities.filter((item) => !item.estimated).forEach((item) => usedActivities.add(item.id));
      linkedQuestions.filter((item) => !item.estimated).forEach((item) => usedQuestions.add(item.id));
      const evidenceText = text(row.evidence);
      const evidenceEstimated = row.evidenceInferred === true || !evidenceText;
      const declaredActivities = linkedActivities.filter((item) => !item.estimated);
      const declaredQuestions = linkedQuestions.filter((item) => !item.estimated);
      const cell = {
        position: position + 1,
        objective,
        bloom: level || null,
        vague: level === "vago",
        activities: linkedActivities,
        questions: linkedQuestions,
        evidence: evidenceText,
        evidenceEstimated,
        hasActivity: declaredActivities.length > 0,
        hasQuestion: declaredQuestions.length > 0,
        hasEvidence: Boolean(evidenceText) && !evidenceEstimated
      };
      if (cell.vague) add("media", "objective-vague", weekNumber, `Semana ${weekNumber}, objetivo ${cell.position}: o verbo é vago (difícil de observar e de avaliar). Troque por um verbo observável, como explicar, comparar, aplicar ou elaborar.`);
      if (!cell.hasActivity) add("alta", "objective-no-activity", weekNumber, `Semana ${weekNumber}, objetivo ${cell.position}: nenhuma atividade foi ligada a este objetivo${linkedActivities.length ? " (a ligação que existe foi só estimada pelo app)" : ""}.`);
      if (!cell.hasQuestion) add("alta", "objective-no-question", weekNumber, `Semana ${weekNumber}, objetivo ${cell.position}: nenhuma questão da avaliação cobre este objetivo${linkedQuestions.length ? " (a ligação que existe foi só estimada pelo app)" : ""}.`);
      if (!cell.hasEvidence) add("media", "objective-no-evidence", weekNumber, `Semana ${weekNumber}, objetivo ${cell.position}: falta dizer qual evidência mostra que o estudante atingiu o objetivo.`);
      return cell;
    });

    const orphanActivities = activities.filter((activity) => !usedActivities.has(activity.id));
    const orphanQuestions = questions.filter((question) => !usedQuestions.has(question.id));
    // Só vale apontar "sem objetivo" quando a semana tem objetivos para ligar.
    if (objectives.length) {
      orphanActivities.forEach((activity) => add("media", "activity-orphan", weekNumber, `Semana ${weekNumber}: a atividade «${activity.title}» não está ligada a nenhum objetivo.`));
      if (orphanQuestions.length) add("media", "question-orphan", weekNumber, `Semana ${weekNumber}: ${orphanQuestions.length === 1 ? "a questão" : "as questões"} ${orphanQuestions.map((question) => question.number).join(", ")} ${orphanQuestions.length === 1 ? "não está ligada" : "não estão ligadas"} a nenhum objetivo.`);
    }
    if (!objectives.length) add("alta", "week-no-objectives", weekNumber, `Semana ${weekNumber}: não tem objetivos de aprendizagem.`);
    if (!activities.length) add("media", "week-no-activity", weekNumber, `Semana ${weekNumber}: não tem atividade planejada.`);
    if (!questions.length) add("media", "week-no-assessment", weekNumber, `Semana ${weekNumber}: não tem questões de avaliação.`);

    const load = loadWeeks.find((item) => Number(item.weekNumber) === weekNumber) || loadWeeks[index] || {};
    const target = Number(load.targetLearnerMinutes ?? load.targetMinutes) || 0;
    const calculated = Number(load.calculatedMinutes) || 0;
    let loadStatus = "sem-dado";
    if (target > 0 && calculated > 0) {
      const ratio = calculated / target;
      loadStatus = ratio > 1 + LOAD_TOLERANCE ? "acima" : ratio < 1 - LOAD_TOLERANCE ? "abaixo" : "ok";
      if (loadStatus === "acima") add("alta", "load-over", weekNumber, `Semana ${weekNumber}: a carga calculada (${Math.round(calculated)} min) passa ${Math.round((ratio - 1) * 100)}% da meta (${Math.round(target)} min). Os estudantes podem não dar conta.`);
      if (loadStatus === "abaixo") add("media", "load-under", weekNumber, `Semana ${weekNumber}: a carga calculada (${Math.round(calculated)} min) fica ${Math.round((1 - ratio) * 100)}% abaixo da meta (${Math.round(target)} min). Há espaço para mais conteúdo ou atividade.`);
    }
    const bloomCounts = Object.fromEntries(BLOOM_LEVELS.map((level) => [level, rows.filter((row) => row.bloom === level).length]));
    return {
      weekNumber,
      theme: text(plan.theme || lesson?.meta?.title),
      objectives: rows,
      activities,
      questions,
      orphanActivities,
      orphanQuestions,
      bloomCounts,
      load: { calculated, target, status: loadStatus },
      generated: true
    };
  });

  // Objetivos da UC × objetivos das semanas: estimativa por palavras em comum.
  const courseObjectives = asList(input.objectives).map(itemText).filter(Boolean).map((objective, position) => {
    const own = stems(objective);
    const matched = [];
    for (const week of mapWeeks) {
      const best = week.objectives.reduce((top, row) => Math.max(top, stems(row.objective).filter((stem) => own.includes(stem)).length), 0);
      if (best >= Math.min(2, own.length) && best > 0) matched.push(week.weekNumber);
    }
    const cell = { position: position + 1, objective, weeks: matched, covered: matched.length > 0 };
    if (!cell.covered && mapWeeks.some((week) => week.objectives.length)) add("media", "course-objective-uncovered", null, `Objetivo ${cell.position} da UC («${objective.slice(0, 90)}${objective.length > 90 ? "…" : ""}»): nenhuma semana tem objetivo com palavras em comum com ele. Confira se ele está mesmo coberto.`);
    return cell;
  });

  const allObjectives = mapWeeks.flatMap((week) => week.objectives);
  const higher = allObjectives.filter((row) => ["aplicar", "analisar", "avaliar", "criar"].includes(row.bloom)).length;
  if (allObjectives.length >= 6 && higher === 0) add("info", "bloom-low", null, "Todos os objetivos do curso estão nos níveis lembrar e entender (Bloom). Considere pedir aplicar, analisar ou criar em alguma semana.");

  const order = { alta: 0, media: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity] || (a.weekNumber ?? 999) - (b.weekNumber ?? 999));
  const summary = {
    weeks: mapWeeks.length,
    objectives: allObjectives.length,
    withoutActivity: allObjectives.filter((row) => !row.hasActivity).length,
    withoutQuestion: allObjectives.filter((row) => !row.hasQuestion).length,
    withoutEvidence: allObjectives.filter((row) => !row.hasEvidence).length,
    orphanActivities: mapWeeks.reduce((sum, week) => sum + week.orphanActivities.length, 0),
    orphanQuestions: mapWeeks.reduce((sum, week) => sum + week.orphanQuestions.length, 0),
    overloadedWeeks: mapWeeks.filter((week) => week.load.status === "acima").length,
    issues: issues.filter((item) => item.severity !== "info").length,
    estimatedLinks: allObjectives.filter((row) => row.activities.some((item) => item.estimated) || row.questions.some((item) => item.estimated)).length
  };
  return { weeks: mapWeeks, courseObjectives, issues, summary };
}

const BLOOM_LABEL = { lembrar: "Lembrar", entender: "Entender", aplicar: "Aplicar", analisar: "Analisar", avaliar: "Avaliar", criar: "Criar", vago: "Verbo vago" };
export const bloomLabel = (level) => BLOOM_LABEL[level] || "—";

// Linhas planas para a planilha (uma por objetivo de cada semana) e para a lista de lacunas.
export function alignmentSheets(map, meta = {}) {
  const yesNo = (flag) => flag ? "Sim" : "LACUNA";
  const linkText = (items, label) => items.length ? items.map((item) => label(item) + (item.estimated ? " (estimada)" : "")).join("; ") : "—";
  return [
    {
      name: "Mapa",
      columns: [{ header: "Semana", width: 9, center: true }, { header: "Objetivo", width: 54 }, { header: "Bloom", width: 12, center: true }, { header: "Atividades ligadas", width: 34 }, { header: "Atividade?", width: 11, center: true }, { header: "Evidência", width: 40 }, { header: "Evidência?", width: 11, center: true }, { header: "Questões ligadas", width: 22 }, { header: "Questão?", width: 11, center: true }],
      rows: map.weeks.flatMap((week) => week.objectives.length ? week.objectives.map((row) => [
        week.weekNumber, row.objective, bloomLabel(row.bloom),
        linkText(row.activities, (item) => item.title), yesNo(row.hasActivity),
        row.evidence ? row.evidence + (row.evidenceEstimated ? " (estimada)" : "") : "—", yesNo(row.hasEvidence),
        linkText(row.questions, (item) => `Questão ${item.number}`), yesNo(row.hasQuestion)
      ]) : [[week.weekNumber, "(sem objetivos)", "—", "—", "LACUNA", "—", "LACUNA", "—", "LACUNA"]])
    },
    {
      name: "Carga",
      columns: [{ header: "Semana", width: 9, center: true }, { header: "Tema", width: 50 }, { header: "Carga calculada (min)", width: 20, center: true }, { header: "Meta (min)", width: 14, center: true }, { header: "Situação", width: 18, center: true }],
      rows: map.weeks.map((week) => [week.weekNumber, week.theme || "—", Math.round(week.load.calculated), Math.round(week.load.target), { acima: "Acima da meta", abaixo: "Abaixo da meta", ok: "Dentro da meta", "sem-dado": "Sem dado" }[week.load.status]])
    },
    {
      name: "Lacunas",
      columns: [{ header: "Gravidade", width: 12, center: true }, { header: "Semana", width: 9, center: true }, { header: "O que falta", width: 120 }],
      rows: map.issues.length ? map.issues.map((item) => [{ alta: "Alta", media: "Média", info: "Aviso" }[item.severity], item.weekNumber ?? "UC", item.text]) : [["—", "—", "Nenhuma lacuna encontrada."]]
    }
  ];
}
