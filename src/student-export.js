import { normalizeAbntCitation } from "./abnt.js";
import { canonicalResourceUrl, extractHrefFromMarkup, resourceIdentity, youtubeVideoId } from "./resource-identity.js";
const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const text = (value, fallback = "") => String(value ?? "").trim() || fallback;

// Crédito do aplicativo, presente nos arquivos gerados (meta do ClassAtelier, PDF, Moodle XML, JSON do ClassAuthor).
export const APP_NAME = "ClassAuthor";
export const GENERATOR_TOOL = `${APP_NAME} (INOVALAB - IFSC)`;
// Continua a frase "Produzido com apoio de <ferramenta>…" (a vírgula inicial cola no nome da ferramenta) no bloco Apoio de IA do rodapé das aulas.
export const GENERATOR_AI_USE = ", uma ferramenta de planejamento pedagógico desenvolvida por Rogério Bittencourt.";
export const GENERATOR_CREDIT = `Conteúdo elaborado com ${APP_NAME}, uma ferramenta de planejamento pedagógico desenvolvida por Rogério Bittencourt, INOVALAB - IFSC.`;
const GENERATOR_CREDIT_HTML = `<p style="text-align:center;font-size:.85em;opacity:.8">Conteúdo elaborado com <strong>${APP_NAME}</strong>, uma ferramenta de planejamento pedagógico desenvolvida por Rogério Bittencourt, INOVALAB - IFSC.</p>`;

const escapeHtml = (value) => text(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Referência ABNT: o título vem marcado com **negrito** e vira <strong> (já escapado).
const referenceMarkup = (value) => escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

// O bloco "referencias" do ClassAtelier recebe cada item como texto HTML (um objeto aparece como
// "[object Object]"). O link, quando existe, vai dentro da própria linha. Aceita também o formato
// antigo ({ html, href }), que está salvo nas semanas geradas antes desta correção.
export function referenceItemHtml(item) {
  const entry = typeof item === "string" ? { citation: item } : object(item);
  const body = entry.html != null && text(entry.html) ? text(entry.html) : referenceMarkup(normalizeAbntCitation(entry.citation || entry.title || entry.href));
  const href = text(entry.href);
  const canonicalHref = canonicalResourceUrl(href);
  const safeHref = /^https?:\/\//i.test(canonicalHref) ? canonicalHref.replace(/"/g, "%22") : "";
  const hasLink = safeHref && !body.includes(escapeHtml(href)) && !body.includes(safeHref);
  return hasLink ? `${body} <a href="${safeHref}" target="_blank" rel="noopener noreferrer">${escapeHtml(href)}</a>` : body;
}

// O quiz não vai para o ClassAtelier: sai em Moodle XML (feedback em todas as alternativas), e a
// versão completa fica no JSON do ClassAuthor.
const STUDENT_PLAN_KEYS = [
  "weekNumber", "theme", "welcome", "learningObjectives", "prerequisites", "contentDensity",
  "contentSections", "activities", "diagnostic", "formativeChecks", "differentiation",
  "selfAssessment", "synthesis", "nextWeekConnection", "glossary", "references"
];

function studentSection(section = {}) {
  const item = object(section);
  return {
    number: text(item.number),
    title: text(item.title, "Seção"),
    body: text(item.body),
    subsections: Array.isArray(item.subsections) ? item.subsections.map((sub) => ({
      number: text(sub?.number),
      title: text(sub?.title, "Subseção"),
      body: text(sub?.body)
    })).filter((sub) => sub.title || sub.body) : [],
    caseStudy: item.caseStudy ? {
      title: text(item.caseStudy.title, "Estudo de caso"),
      context: text(item.caseStudy.context || item.caseStudy.body),
      data: text(item.caseStudy.data),
      questions: Array.isArray(item.caseStudy.questions) ? item.caseStudy.questions.map((question) => text(question)).filter(Boolean) : []
    } : null,
    reflection: item.reflection ? {
      question: text(item.reflection.question || item.reflection.title),
      body: text(item.reflection.body || item.reflection.context)
    } : null,
    keyTerms: Array.isArray(item.keyTerms) ? item.keyTerms.map((term) => text(term)).filter(Boolean) : []
  };
}

function referenceHref(item) {
  if (typeof item === "string") return extractHrefFromMarkup(item);
  const entry = object(item);
  return text(entry.href || extractHrefFromMarkup(entry.html));
}

function referenceKey(item) {
  const hrefIdentity = resourceIdentity(referenceHref(item), "article");
  if (hrefIdentity) return hrefIdentity;
  const entry = typeof item === "string" ? { citation: item } : object(item);
  const plain = text(entry.citation || entry.title || entry.html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return plain ? `citation:${plain}` : "";
}

function withoutReferenceLink(item) {
  const stripAnchors = (value) => String(value ?? "").replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, "$1");
  if (typeof item === "string") return stripAnchors(item);
  const entry = { ...object(item), href: "" };
  if (entry.html) entry.html = stripAnchors(entry.html);
  return entry;
}

function deduplicateMarkupLinks(value, context) {
  if (typeof value !== "string") return value;
  return value.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, (anchor) => {
    const identity = resourceIdentity(extractHrefFromMarkup(anchor), "article");
    if (!identity) return anchor;
    const label = anchor.replace(/^<a\b[^>]*>/i, "").replace(/<\/a>$/i, "");
    if (context.materialLinks.has(identity) || context.referenceLinks.has(identity) || context.seenMarkupLinks.has(identity)) return label;
    context.seenMarkupLinks.add(identity);
    return anchor;
  });
}

function videoProps(props = {}, id, defaults = {}) {
  const source = object(props);
  return {
    id,
    title: text(source.title || defaults.title, "Vídeo"),
    caption: text(source.caption || defaults.caption),
    credit: text(source.credit || source.author || source.source || defaults.credit),
    start: text(source.start || defaults.start),
    captionsOk: Boolean(source.captionsOk),
    transcript: text(source.transcript),
    transcriptUrl: text(source.transcriptUrl),
    transcriptCues: Array.isArray(source.transcriptCues) ? source.transcriptCues : [],
    summaryMd: text(source.summaryMd),
    showSubtitle: source.showSubtitle !== false,
    showSummary: source.showSummary !== false,
    showTranscript: source.showTranscript !== false
  };
}

function nativeVideoBlock(source, props, rawId, context, defaults = {}) {
  const id = youtubeVideoId(rawId);
  if (!id || context.seenVideos.has(id)) return null;
  context.seenVideos.add(id);
  return {
    id: text(source.id, `video-${id}`),
    type: "video",
    ...(source.bg ? { bg: source.bg } : {}),
    ...(source.pad ? { pad: source.pad } : {}),
    props: videoProps(props, id, defaults)
  };
}

function createSanitizeContext(blocks) {
  const context = {
    nativeVideoIds: new Set(),
    seenVideos: new Set(),
    materialLinks: new Set(),
    referenceLinks: new Set(),
    seenMaterialLinks: new Set(),
    seenReferenceItems: new Set(),
    seenMarkupLinks: new Set(),
    materialVideoIds: new Set()
  };
  const visit = (items = []) => (items || []).forEach((block) => {
    const source = object(block);
    const props = object(source.props);
    if (source.type === "video") {
      const id = youtubeVideoId(props.id || props.videoId);
      if (id) {
        context.nativeVideoIds.add(id);
        context.materialLinks.add(`youtube:${id}`);
      }
    }
    if (source.type === "prose" && props.inlineVideo?.id) {
      const id = youtubeVideoId(props.inlineVideo.id);
      if (id) {
        context.nativeVideoIds.add(id);
        context.materialLinks.add(`youtube:${id}`);
      }
    }
    if (source.type === "materiais" && Array.isArray(props.items)) props.items.forEach((item) => {
      const href = text(item?.href || item?.link || item?.url);
      const videoId = youtubeVideoId(href);
      const identity = resourceIdentity(href, item?.type || item?.kind || "article");
      if (identity) context.materialLinks.add(identity);
      if (videoId) context.materialVideoIds.add(videoId);
    });
    if (source.type === "referencias" && Array.isArray(props.items)) props.items.forEach((item) => {
      const identity = resourceIdentity(referenceHref(item), "article");
      if (identity) context.referenceLinks.add(identity);
    });
    visit(props.children);
  });
  visit(blocks);
  return context;
}

function sanitizeBlocks(blocks = [], context) {
  return (Array.isArray(blocks) ? blocks : []).flatMap((block) => {
    const result = sanitizeBlock(block, context);
    return Array.isArray(result) ? result.filter(Boolean) : result ? [result] : [];
  });
}

function sanitizeBlock(block = {}, context) {
  const source = object(block);
  const props = object(source.props);
  if (source.type === "quiz") return null;

  // Compatibilidade: semanas já salvas com inlineVideo passam a usar a área de mídia nativa.
  if (source.type === "prose" && props.inlineVideo?.id) {
    return nativeVideoBlock(source, { ...props.inlineVideo, resourceId: undefined }, props.inlineVideo.id, context);
  }
  if (source.type === "prose" && props.resourceId) return null;
  if (source.type === "video") return nativeVideoBlock(source, props, props.id || props.videoId, context);

  const children = Array.isArray(props.children) ? sanitizeBlocks(props.children, context) : null;
  const nextProps = { ...props };
  delete nextProps.resourceId;
  delete nextProps.searchQuery;
  delete nextProps.verificationStatus;
  delete nextProps.requiresVerification;
  delete nextProps.humanApproval;
  delete nextProps.selectionReason;
  delete nextProps.pedagogicalUse;
  delete nextProps.objective;
  delete nextProps.alignment;
  delete nextProps.moment;
  delete nextProps.sectionNumber;
  delete nextProps.notes;
  if (children) nextProps.children = children;
  if (typeof nextProps.body === "string") nextProps.body = deduplicateMarkupLinks(nextProps.body, context);

  // Sugestões sem URL ficam disponíveis para a mediação docente, mas não são
  // uma experiência utilizável pelo estudante no ClassAtelier.
  if (source.type === "imagem" && !text(props.src || props.href)) return null;
  if (source.type === "audio" && !text(props.src || props.href || props.spotify)) return null;
  if (source.type === "externalembed" && !text(props.embed || props.src || props.href)) return null;

  if (source.type === "referencias" && Array.isArray(props.items)) {
    nextProps.items = props.items.flatMap((item) => {
      const key = referenceKey(item);
      if (key && context.seenReferenceItems.has(key)) return [];
      if (key) context.seenReferenceItems.add(key);
      const identity = resourceIdentity(referenceHref(item), "article");
      const value = identity && context.materialLinks.has(identity) ? withoutReferenceLink(item) : item;
      const html = referenceItemHtml(value);
      return html ? [html] : [];
    });
    if (!nextProps.items.length) return null;
  }
  if (source.type === "materiais" && Array.isArray(props.items)) {
    const nativeVideos = [];
    nextProps.items = props.items.flatMap((item) => {
      const href = text(item?.href || item?.link || item?.url);
      const videoId = youtubeVideoId(href);
      if (videoId) {
        if (context.nativeVideoIds.has(videoId)) return [];
        const videoSource = { ...source, id: `${text(source.id, "materiais")}-video-${videoId}` };
        const video = nativeVideoBlock(videoSource, {}, videoId, context, {
          title: text(item?.title, "Vídeo"),
          caption: text(item?.caption),
          credit: text(item?.credit || item?.author || item?.source)
        });
        if (video) nativeVideos.push(video);
        return [];
      }
      const identity = resourceIdentity(href, item?.type || item?.kind || "article");
      if (!href || (identity && context.seenMaterialLinks.has(identity))) return [];
      if (identity) context.seenMaterialLinks.add(identity);
      const kind = text(item?.type || item?.kind, "material");
      return [{
        type: kind === "reading" ? "artigo" : kind,
        title: text(item?.title, "Material de apoio"),
        source: text(item?.source || item?.author || item?.publisher || item?.credit),
        href: canonicalResourceUrl(href) || href
      }];
    });
    const materialBlock = nextProps.items.length ? [{ id: text(source.id), type: text(source.type), ...(source.bg ? { bg: source.bg } : {}), ...(source.pad ? { pad: source.pad } : {}), props: nextProps }] : [];
    return [...nativeVideos, ...materialBlock];
  }
  if (source.type === "imagem") {
    nextProps.src = text(props.src);
    nextProps.caption = text(props.caption || props.title);
    nextProps.credit = text(props.credit);
    nextProps.alt = text(props.alt || props.altText || props.caption);
  }
  return { id: text(source.id), type: text(source.type), ...(source.bg ? { bg: source.bg } : {}), ...(source.pad ? { pad: source.pad } : {}), props: nextProps };
}

function studentPlan(plan = {}, context) {
  const source = object(plan);
  const result = {};
  STUDENT_PLAN_KEYS.forEach((key) => {
    if (source[key] !== undefined) result[key] = source[key];
  });
  result.contentSections = Array.isArray(source.contentSections) ? source.contentSections.map(studentSection) : [];
  // A composição já foi materializada em blocks. O pedido de composição e
  // suas justificativas são dados de planejamento, não conteúdo do aluno.
  result.activities = Array.isArray(source.activities) ? source.activities.map((activity) => ({
    id: text(activity?.id),
    type: text(activity?.type, "atividade"),
    title: text(activity?.title, "Atividade"),
    count: Number(activity?.count || 1) || 1,
    durationMinutes: Number(activity?.durationMinutes || 0) || 0,
    required: activity?.required !== false,
    instructions: text(activity?.instructions),
    evidence: text(activity?.evidence),
    evidenceType: text(activity?.evidenceType),
    criteria: Array.isArray(activity?.criteria) ? activity.criteria.map((item) => text(item)).filter(Boolean) : []
  })) : [];
  result.formativeChecks = Array.isArray(source.formativeChecks) ? source.formativeChecks.map((check) => ({
    id: text(check?.id),
    moment: text(check?.moment),
    prompt: text(check?.prompt),
    expectedEvidence: text(check?.expectedEvidence)
  })) : [];
  result.differentiation = source.differentiation ? {
    support: source.differentiation.support || [],
    standard: source.differentiation.standard || [],
    extension: source.differentiation.extension || [],
    rationale: text(source.differentiation.rationale)
  } : { support: [], standard: [], extension: [], rationale: "" };
  result.diagnostic = source.diagnostic || {};
  result.selfAssessment = source.selfAssessment || {};
  const seenReferences = new Set();
  result.references = Array.isArray(source.references) ? source.references.flatMap((reference) => {
    const entry = typeof reference === "string" ? { citation: text(reference) } : object(reference);
    const citation = text(entry.citation || entry.title);
    const href = text(entry.href);
    const identity = resourceIdentity(href, "article");
    const key = identity || `citation:${citation.replace(/\s+/g, " ").toLowerCase()}`;
    if (seenReferences.has(key)) return [];
    seenReferences.add(key);
    return [{
      id: text(entry.id),
      citation,
      type: text(entry.type),
      authors: Array.isArray(entry.authors) ? entry.authors.map((author) => text(author)).filter(Boolean) : [],
      year: text(entry.year),
      publisher: text(entry.publisher),
      doi: text(entry.doi),
      href: identity && (context.materialLinks.has(identity) || context.referenceLinks.has(identity)) ? "" : href
    }];
  }) : [];
  return result;
}

/**
 * Gera a versão que pode ser aberta no ClassAtelier.
 *
 * A aula interna permanece rica para revisão, mas a camada do estudante não
 * recebe alinhamento pedagógico, cálculo de tempo, ajustes de carga, mapa de
 * evidências, estado de revisão, curadoria interna ou mensagens de mediação.
 */
export function toStudentLesson(lesson = {}) {
  const source = object(lesson);
  const meta = object(source.meta);
  const sourceBlocks = Array.isArray(source.blocks) ? source.blocks : [];
  const sanitizeContext = createSanitizeContext(sourceBlocks);
  const blocks = sanitizeBlocks(sourceBlocks, sanitizeContext);
  return {
    meta: {
      title: text(meta.title),
      courseTitle: text(meta.courseTitle),
      weekNumber: Number(meta.weekNumber || 0) || 0,
      unit: text(meta.unit) === "aula" || /^aula\b/i.test(text(meta.weekLabel)) ? "aula" : "semana",
      weekLabel: text(meta.weekLabel),
      calendarStartDate: text(meta.calendarStartDate),
      calendarEndDate: text(meta.calendarEndDate),
      author: text(meta.author),
      role: text(meta.role),
      institution: text(meta.institution),
      year: text(meta.year),
      license: text(meta.license),
      aiTool: text(meta.aiTool, GENERATOR_TOOL),
      aiUse: text(meta.aiUse, GENERATOR_AI_USE),
      generatedBy: GENERATOR_CREDIT
    },
    lessonPlan: studentPlan(source.lessonPlan, sanitizeContext),
    blocks: [...blocks, creditBlock(meta.weekNumber)]
  };
}

// Rodapé de autoria no fim da aula, como "Conteúdo elaborado com ...": o último bloco da aula do ClassAtelier.
function creditBlock(weekNumber) {
  const week = Number(weekNumber || 0) || 0;
  return { id: `b-credit-${String(week).padStart(2, "0")}`, type: "topic", bg: "neutral-default", pad: "normal", props: { children: [{ id: `c-credit-${String(week).padStart(2, "0")}`, type: "prose", props: { body: GENERATOR_CREDIT_HTML, dropcap: false } }] } };
}

export function toStudentLessons(lessons = []) {
  return Array.isArray(lessons) ? lessons.map(toStudentLesson) : [];
}

/**
 * Versão completa da semana, para o ClassAuthor (reimportar, revisar, arquivar):
 * a aula inteira, com quiz, feedbacks, revisões, cálculo de tempo e o guia do professor.
 */
export function toGeneratorWeek(lesson = {}, teacherGuide = null, extra = {}) {
  return {
    generator: "classauthor",
    format: "classauthor-semana",
    version: 1,
    exportedAt: extra.exportedAt || new Date().toISOString(),
    credit: GENERATOR_CREDIT,
    week: lesson,
    teacherGuide: teacherGuide || lesson?.teacherGuide || null
  };
}
