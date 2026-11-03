// Ficha da disciplina (Plano de Ensino) no modelo do IFSC: cabeçalho, ementa, objetivos, conteúdo
// programático e carga horária, método de ensino, avaliação, instrumentos e critérios, referências.
//
// Código puro (sem Node): public/ficha-disciplina.js é cópia idêntica deste arquivo e roda no navegador.
// A ficha nasce do que o ClassAuthor já planejou (título, carga, objetivos, temas, atividades, práticas,
// referências) e fica editável: o app não inventa o que não tem (curso, ementa oficial, pesos e e-mails
// ficam para o professor conferir). Referências só entram marcadas quando foram conferidas.
import { sortReferencesAbnt } from "./abnt.js";

const text = (value) => String(value ?? "").trim();
const lines = (value) => (Array.isArray(value) ? value : text(value).split(/\r?\n+/)).map((item) => text(item).replace(/^[-•*\d.)\s]+(?=\S)/, "")).filter(Boolean);

// Textos do modelo de Plano de Ensino do IFSC (Regimento Didático Pedagógico). São o ponto de partida:
// o professor confere se ainda valem e pode editar tudo antes de baixar.
export const FICHA_EVALUATION_IFSC = [
  "A avaliação dos estudantes será realizada como parte integrante do processo educativo e acontecerá ao longo da Unidade Curricular de modo a permitir reflexão-ação-reflexão da aprendizagem e a apropriação do conhecimento, resgatando suas dimensões diagnóstica, formativa, processual e somativa. Os instrumentos de avaliação serão diversificados com o objetivo de estimular o estudante à: pesquisa, extensão, reflexão, iniciativa, criatividade, laboralidade e cidadania.",
  "De acordo com o Art. 41, do Regimento Didático Pedagógico do IFSC, o resultado final da avaliação será registrado por valores inteiros de 0 (zero) a 10 (dez). O resultado mínimo para aprovação em um componente curricular é 6 (seis).",
  "O aluno terá nova oportunidade de prestar atividades de avaliação não realizadas por motivo de doença ou por falecimento de familiares, convocação do judiciário e do serviço militar, desde que encaminhe em até 2 (dois) dias letivos contados do final do afastamento, um requerimento à Coordenadoria de Curso, com os documentos comprobatórios do impedimento. De acordo com a RDP, o requerimento deverá indicar a data e horário das atividades de avaliação não realizadas, o componente curricular e o nome do professor.",
  "A recuperação de estudos, a que todos os alunos têm direito, compreenderá a realização de novas atividades pedagógicas no decorrer do período letivo, cujo resultado será registrado pelo professor, prevalecendo o maior valor entre o obtido na avaliação realizada antes da recuperação e o obtido na avaliação de recuperação."
].join("\n\n");

export const FICHA_FOOTER_IFSC = "Instituto Federal de Santa Catarina/Reitoria Rua: 14 de julho, 150  |  Coqueiros  |  Florianópolis /SC  |  CEP: 88.075-010\nFone: (48) 3877-9000  |  www.ifsc.edu.br  |  CNPJ 11.402.887/0001-60";

export function formatHours(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  const shown = Number.isInteger(number) ? String(number) : String(Math.round(number * 100) / 100).replace(".", ",");
  return `${shown} ${number === 1 ? "hora" : "horas"}`;
}

export function periodOf(startDate, today = new Date()) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text(startDate)) ? new Date(`${startDate}T12:00:00`) : today;
  return `${date.getFullYear()}/${date.getMonth() < 6 ? 1 : 2}`;
}

const brDate = (iso) => text(iso).split("-").reverse().join("/");

function methodText({ practices = [], methodologies = [] } = {}) {
  const parts = [
    "Esta unidade curricular será realizada utilizando-se o Ambiente Virtual de Ensino e Aprendizagem – plataforma Moodle. Os materiais serão apresentados na forma de um livro digital interativo, responsivo para dispositivos móveis, que integra textos, vídeos, imagens, outros documentos e links para materiais externos.",
    `A interação entre alunos e professores acontecerá por meio de fóruns, em especial o Mural de avisos, fórum de dúvidas e fóruns de discussão.${practices.length ? ` Também ${practices.length === 1 ? "será realizado 1 encontro de prática, previsto" : `serão realizados ${practices.length} encontros de prática, previstos`} no cronograma da unidade curricular. Os encontros síncronos utilizam uma plataforma de webconferência e os alunos poderão acessar de qualquer lugar, por meio de um computador ou dispositivo móvel conectado à internet.` : ""}`,
    "Como canal de comunicação, destaca-se ainda a possibilidade de envio de mensagens privadas entre participantes e professores.",
    "Poderão ser utilizados ainda outros recursos disponíveis na plataforma Moodle como: chats, wikis, glossário, tarefas, laboratório de avaliação, enquetes, entre outros.",
    "Para organização dos estudos, os alunos contarão com um calendário configurado com as principais datas de atividades, início e fim da unidade curricular."
  ];
  if (methodologies.length) parts.push(`As atividades aplicam metodologias ativas de aprendizagem: ${methodologies.join("; ")}.`);
  return parts.join("\n\n");
}

// Monta a ficha a partir do que o ClassAuthor tem. `weeks` são as lições geradas (com lessonPlan).
export function fichaDefaults({ input = {}, weeks = [], generalPlan = null, author = "" } = {}) {
  const generated = (Array.isArray(weeks) ? weeks : []).map((lesson, index) => ({ lesson, index })).filter(({ lesson }) => lesson?.lessonPlan);
  const themeOf = ({ lesson, index }) => text(lesson.lessonPlan.theme || lesson.meta?.title) || `Semana ${index + 1}`;
  const totalHours = (Number(input.weeks) || generated.length || 0) * (Number(input.hoursPerWeek) || 0);

  const contents = [];
  generated.forEach((entry, position) => {
    contents.push({ text: `${position + 1}. ${themeOf(entry)}`, level: 0 });
    const sections = (Array.isArray(entry.lesson.lessonPlan.contentSections) ? entry.lesson.lessonPlan.contentSections : []).map((section) => text(section?.title)).filter(Boolean).slice(0, 8);
    sections.forEach((title, sub) => contents.push({ text: `${position + 1}.${sub + 1}. ${title}`, level: 1 }));
  });

  const practices = Array.isArray(generalPlan?.webPracticeSchedule) && generalPlan.webPracticeSchedule.length ? generalPlan.webPracticeSchedule : (Array.isArray(input.webPractices) ? input.webPractices.filter((item) => text(item?.title) || Number(item?.weekNumber) > 0) : []);
  const methodologies = [...new Set(generated.map(({ lesson }) => text(lesson.lessonPlan.activeMethodology?.label).replace(/^Metodologia:\s*/i, "")).filter(Boolean))];

  const instruments = [];
  generated.forEach((entry, position) => {
    const when = entry.lesson.meta?.calendarStartDate && entry.lesson.meta?.calendarEndDate
      ? `De ${brDate(entry.lesson.meta.calendarStartDate)} à ${brDate(entry.lesson.meta.calendarEndDate)}`
      : `Semana ${entry.index + 1}`;
    (Array.isArray(entry.lesson.lessonPlan.activities) ? entry.lesson.lessonPlan.activities : []).filter((activity) => activity?.required !== false).forEach((activity) => {
      const criteria = Array.isArray(activity.criteria) ? activity.criteria.map(text).filter(Boolean).join("; ") : text(activity.criteria);
      const instruction = text(activity.instructions).split(/(?<=[.!?])\s/)[0] || "";
      instruments.push({ name: text(activity.title) || "Atividade", criteria: criteria || text(activity.evidence) || instruction.slice(0, 260), weight: "", schedule: when, weekNumber: position + 1 });
    });
    if ((entry.lesson.lessonPlan.assessment?.questions || []).length) instruments.push({ name: `Questionário da Semana ${entry.index + 1}`, criteria: `${entry.lesson.lessonPlan.assessment.questions.length} questões de múltipla escolha sobre o conteúdo da semana, com retorno por alternativa.`, weight: "", schedule: when, weekNumber: position + 1 });
  });

  // Referências: as suas (briefing) entram marcadas; as das semanas, só se foram conferidas.
  const seen = new Set();
  const references = [];
  const addReference = (item, origin) => {
    const citation = text(item.citation);
    const key = citation.replace(/\*\*/g, "").toLowerCase().replace(/\W+/g, " ").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    references.push({ citation, origin, verified: item.verified === true, include: origin === "briefing" || item.verified === true });
  };
  lines(input.references).forEach((citation) => addReference({ citation, verified: true }, "briefing"));
  generated.forEach(({ lesson }) => (Array.isArray(lesson.lessonPlan.references) ? lesson.lessonPlan.references : []).forEach((reference) => addReference(typeof reference === "string" ? { citation: reference } : reference, "semana")));
  const sortedReferences = sortReferencesAbnt(references);

  return {
    preset: "ifsc",
    header: true,
    course: "",
    unit: text(input.title),
    hours: formatHours(totalHours),
    period: periodOf(input.startDate),
    professors: [{ name: text(author), email: "" }],
    ementa: generated.length ? `${generated.map(themeOf).join("; ")}.` : "",
    objectives: lines(input.objectives).join("\n"),
    contents,
    method: methodText({ practices, methodologies }),
    evaluation: FICHA_EVALUATION_IFSC,
    instrumentsIntro: instruments.length ? `Esta Unidade Curricular terá ${instruments.length} instrumentos de avaliação, desenvolvidos no ambiente Moodle.` : "",
    instruments,
    references: sortedReferences,
    footer: FICHA_FOOTER_IFSC,
    generatedWeeks: generated.length,
    totalWeeks: Number(input.weeks) || generated.length
  };
}

export const weightsTotal = (ficha) => (ficha.instruments || []).reduce((sum, row) => sum + (Number.parseFloat(String(row.weight || "").replace("%", "").replace(",", ".")) || 0), 0);

// Pontos a conferir antes de entregar a ficha.
export function fichaChecks(ficha) {
  const checks = [];
  if (!text(ficha.course)) checks.push("Preencha o curso.");
  if (!text(ficha.hours)) checks.push("Informe a carga horária.");
  if (!text(ficha.ementa)) checks.push("A ementa está vazia.");
  if (!text(ficha.objectives)) checks.push("Os objetivos estão vazios.");
  if (!(ficha.professors || []).some((item) => text(item.name))) checks.push("Informe pelo menos um professor.");
  if ((ficha.professors || []).some((item) => text(item.name) && !text(item.email))) checks.push("Falta o e-mail de algum professor.");
  const filled = (ficha.instruments || []).filter((row) => text(row.weight));
  if ((ficha.instruments || []).length && !filled.length) checks.push("Defina o peso de cada instrumento de avaliação.");
  else if ((ficha.instruments || []).length && Math.abs(weightsTotal(ficha) - 100) > 0.01) checks.push(`Os pesos somam ${String(Math.round(weightsTotal(ficha) * 100) / 100).replace(".", ",")}%; devem somar 100%.`);
  if (!(ficha.references || []).some((item) => item.include)) checks.push("Nenhuma referência foi marcada para entrar.");
  const unchecked = (ficha.references || []).filter((item) => !item.include).length;
  if (unchecked) checks.push(`${unchecked} referência(s) das semanas não entraram porque não foram conferidas. Confira a obra e marque, se quiser incluir.`);
  return checks;
}

// ---------- .docx (Word) ----------
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
// eslint-disable-next-line no-control-regex
const esc = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function runs(value, { size = 22, bold = false, italic = false } = {}) {
  const parts = String(value ?? "").split(/(\*\*[^*]+\*\*)/).filter((part) => part !== "");
  return parts.map((part) => {
    const strong = /^\*\*[^*]+\*\*$/.test(part);
    const content = strong ? part.slice(2, -2) : part;
    return `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>${bold || strong ? "<w:b/>" : ""}${italic ? "<w:i/>" : ""}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${esc(content)}</w:t></w:r>`;
  }).join("");
}

function para(value, { align = "both", size = 22, bold = false, italic = false, before = 0, after = 80, indent = 0, keepNext = false } = {}) {
  return `<w:p><w:pPr>${keepNext ? "<w:keepNext/>" : ""}<w:spacing w:before="${before}" w:after="${after}" w:line="300" w:lineRule="auto"/>${indent ? `<w:ind w:left="${indent}"/>` : ""}<w:jc w:val="${align}"/></w:pPr>${runs(value, { size, bold, italic })}</w:p>`;
}

const paragraphsOf = (value, options, { perLine = false } = {}) => {
  const blocks = String(value ?? "").split(perLine ? /\n+/ : /\n{2,}/).map((block) => block.replace(/\n/g, " ").trim()).filter(Boolean);
  return (blocks.length ? blocks : [""]).map((block) => para(block, options)).join("");
};

const BORDER = '<w:tcBorders><w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/></w:tcBorders>';
const cell = (width, content, { span = 1, valign = "top", shade = "" } = {}) => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}${BORDER}${shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : ""}<w:tcMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="${valign}"/></w:tcPr>${content}</w:tc>`;
const table = (widths, rows, { keepRows = false } = {}) => `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>${rows.map((row) => `<w:tr>${keepRows ? "<w:trPr><w:cantSplit/></w:trPr>" : ""}${row}</w:tr>`).join("")}</w:tbl>`;
const heading = (value) => para(value, { align: "left", bold: true, size: 20, before: 220, after: 80, keepNext: true });
const spacer = (after = 120) => `<w:p><w:pPr><w:spacing w:before="0" w:after="${after}"/></w:pPr></w:p>`;

const LABEL_W = 2500;
const PAGE_WIDTH = 9638; // A4 (11906) menos 2 × 1134 de margem

function pngSize(bytes) {
  if (!bytes || bytes.length < 24 || bytes[1] !== 0x50) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export function fichaDocumentXml(ficha, { logo = null } = {}) {
  const cw = [LABEL_W, 3000, 1700, PAGE_WIDTH - LABEL_W - 3000 - 1700];
  const professors = (ficha.professors || []).filter((item) => text(item.name) || text(item.email));
  const names = professors.length ? professors : [{ name: "", email: "" }];
  const each = Math.floor((PAGE_WIDTH - LABEL_W) / names.length);
  const profWidths = names.map((_, position) => (position === names.length - 1 ? PAGE_WIDTH - LABEL_W - each * (names.length - 1) : each));
  const profCells = names.map((item, position) => cell(profWidths[position], `${para(item.name, { align: "center", size: 20, after: 20 })}${text(item.email) ? para(item.email, { align: "center", size: 20, after: 20 }) : ""}`, { valign: "center" }));
  const label = (value) => para(value, { align: "center", bold: true, size: 20, after: 0 });
  const value = (content, align = "left") => para(content, { align, size: 20, after: 0 });
  const info = table([LABEL_W, PAGE_WIDTH - LABEL_W], [
    cell(LABEL_W, label("CURSO"), { valign: "center" }) + cell(PAGE_WIDTH - LABEL_W, value(ficha.course), { valign: "center" }),
    cell(LABEL_W, label("UNIDADE CURRICULAR"), { valign: "center" }) + cell(PAGE_WIDTH - LABEL_W, value(ficha.unit), { valign: "center" })
  ]) + table(cw, [
    cell(cw[0], label("C.H."), { valign: "center" }) + cell(cw[1], value(ficha.hours, "center"), { valign: "center" }) + cell(cw[2], label("ANO/SEMESTRE"), { valign: "center" }) + cell(cw[3], value(ficha.period, "center"), { valign: "center" })
  ]) + table([LABEL_W, ...profWidths], [cell(LABEL_W, label("PROFESSORES"), { valign: "center" }) + profCells.join("")]);

  const box = (value, split = {}) => table([PAGE_WIDTH], [cell(PAGE_WIDTH, paragraphsOf(value, { size: 20, after: 60 }, split))]);

  const contentRows = (ficha.contents || []).map((item) => para(item.text, { align: "left", size: 20, after: 40, indent: item.level ? 0 : 0 })).join("");
  const contentTable = table([8200, PAGE_WIDTH - 8200], [
    cell(8200, para("Conteúdo Programático", { align: "center", bold: true, size: 18, after: 0 })) + cell(PAGE_WIDTH - 8200, para("C.H", { align: "center", bold: true, size: 18, after: 0 })),
    cell(8200, contentRows || para("", { size: 20 })) + cell(PAGE_WIDTH - 8200, para(ficha.hours, { align: "center", size: 20, after: 0 }), { valign: "center" })
  ]);

  const iw = [1900, 4638, 1000, 2100];
  const instrumentRows = (ficha.instruments || []).map((row) => cell(iw[0], para(row.name, { align: "left", bold: true, size: 18, after: 0 }), { valign: "center" }) + cell(iw[1], para(row.criteria, { size: 18, after: 0 }), { valign: "center" }) + cell(iw[2], para(row.weight ? (String(row.weight).includes("%") ? row.weight : `${row.weight}%`) : "", { align: "center", size: 18, after: 0 }), { valign: "center" }) + cell(iw[3], para(row.schedule, { align: "center", size: 18, after: 0 }), { valign: "center" }));
  const instrumentsTable = table(iw, [
    cell(PAGE_WIDTH, paragraphsOf(ficha.instrumentsIntro || "", { size: 20, after: 40 }), { span: 4 }),
    cell(iw[0], para("Instrumentos", { align: "center", bold: true, size: 18, after: 0 })) + cell(iw[1], para("Critérios", { align: "center", bold: true, size: 18, after: 0 })) + cell(iw[2], para("Peso", { align: "center", bold: true, size: 18, after: 0 })) + cell(iw[3], para("Cronograma", { align: "center", bold: true, size: 18, after: 0 })),
    ...instrumentRows
  ], { keepRows: true });

  const refs = (ficha.references || []).filter((item) => item.include).map((item) => para(item.citation, { align: "left", size: 20, after: 120 })).join("");

  const header = ficha.header && logo ? "<w:headerReference w:type=\"default\" r:id=\"rIdHeader\"/>" : "";
  const footer = text(ficha.footer) ? "<w:footerReference w:type=\"default\" r:id=\"rIdFooter\"/>" : "";
  const body = [
    para("PLANO DE ENSINO", { align: "center", bold: true, size: 20, before: 120, after: 200 }),
    info,
    heading("1. EMENTA"), box(ficha.ementa),
    heading("2. OBJETIVOS"), box(ficha.objectives, { perLine: true }),
    heading("3. CONTEÚDO PROGRAMÁTICO E CARGA HORÁRIA (C.H.)"), contentTable,
    heading("4. MÉTODO DE ENSINO E RECURSOS DIDÁTICOS"), box(ficha.method),
    heading("5. AVALIAÇÃO"), box(ficha.evaluation),
    heading("6. INSTRUMENTOS E CRITÉRIOS DE AVALIAÇÃO"), instrumentsTable,
    heading("REFERÊNCIAS"), table([PAGE_WIDTH], [cell(PAGE_WIDTH, refs || para("", { size: 20 }))]),
    spacer(0)
  ].join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}<w:sectPr>${header}${footer}<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1700" w:right="1134" w:bottom="1300" w:left="1134" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

function headerXml(logo) {
  const size = pngSize(logo) || { width: 340, height: 400 };
  const height = 720000; // 2 cm
  const width = Math.round((height * size.width) / size.height);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS}><w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${width}" cy="${height}"/><wp:docPr id="1" name="Logotipo" descr="Logotipo da instituição"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="1" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:hdr>`;
}

function footerXml(value) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}>${String(value).split(/\n/).map((line) => para(line, { align: "center", size: 16, after: 0 })).join("")}</w:ftr>`;
}

// JSZipConstructor: window.JSZip no navegador, ou o import de "jszip" no Node.
// logo: bytes de um PNG (opcional). output: "blob" | "nodebuffer" | "uint8array".
export async function createFichaDocx(JSZipConstructor, ficha, { logo = null, output = "uint8array" } = {}) {
  const useLogo = Boolean(ficha.header && logo);
  const useFooter = Boolean(text(ficha.footer));
  const zip = new JSZipConstructor();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${useLogo ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ""}${useFooter ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : ""}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(`Plano de Ensino - ${ficha.unit || ""}`)}</dc:title><dc:creator>ClassAuthor</dc:creator></cp:coreProperties>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${useLogo ? '<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' : ""}${useFooter ? '<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' : ""}</Relationships>`);
  zip.file("word/document.xml", fichaDocumentXml(ficha, { logo: useLogo ? logo : null }));
  if (useLogo) {
    zip.file("word/header1.xml", headerXml(logo));
    zip.file("word/_rels/header1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/></Relationships>`);
    zip.file("word/media/logo.png", logo);
  }
  if (useFooter) zip.file("word/footer1.xml", footerXml(ficha.footer));
  return zip.generateAsync({ type: output, compression: "DEFLATE", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
