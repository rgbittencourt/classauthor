import { callJson } from "./ai-client.js";

// Slides para o ClassAtelier: a IA escolhe o CONTEÚDO de cada slide dentro de um catálogo
// fechado de tipos; o desenho (paleta, tipografia, grade) é todo do ClassAtelier.
// Dois modos: "frame" (pergunta da aula, objetivos e síntese) e "section" (slides de uma seção).

export const SLIDE_TYPES = ["statement", "cards", "list", "formula", "calc", "compare", "steps", "cycle", "timeline", "scale", "chart", "table", "bignumber", "reflect", "alert", "quote", "image"];

const CATALOG = `Catálogo (use só estes tipos e campos):
statement {type, eyebrow?, text, sub?} — frase ou pergunta de impacto, uma só ideia.
cards {type, title, items:[{title, text}]} — 2 a 4 cartões paralelos.
list {type, title, items:[string]} — 3 a 5 itens curtos (use pouco).
formula {type, title, formula, legend:[{sym, text}], note?} — fórmula em texto simples com símbolos Unicode (ex.: R = c·t/2, λ = c/f, 3×10⁸ m/s); até 4 itens na legenda.
calc {type, title, given:[{sym, text}], steps:[string], result, unit?} — exemplo resolvido: dados (até 4), 2 a 4 linhas da conta em texto simples com Unicode (ex.: "R = c·t/2", "R = (3×10⁸ × 5×10⁻³)/2", "R = 7,5×10⁵ m") e o resultado curto (ex.: "750 km").
compare {type, title, left:{label, title, text}, right:{label, title, text}} — dois lados contrastados.
steps {type, title, steps:[{title, text}]} — 3 ou 4 etapas de um processo ou sequência.
cycle {type, title, steps:[{title, text}]} — 3 a 5 etapas que se repetem em ciclo (desenhadas em círculo).
timeline {type, title, events:[{date, title, text}]} — 2 a 4 marcos datados.
scale {type, title, from, to, marks:[{label, value?, text?}], note?} — régua ou espectro com 3 a 8 marcas em ordem (ex.: bandas P a Ka, escala em dB, faixas do espectro); from e to são os rótulos das pontas (ex.: "ondas longas", "ondas curtas").
chart {type, title, unit, items:[{label, value}], note?} — gráfico de barras com 2 a 8 valores numéricos QUE ESTÃO NO TEXTO (value é número).
table {type, title, headers:[string], rows:[[string]]} — até 6 linhas e 4 colunas.
bignumber {type, title, value, label, text?} — um número ou resultado de destaque (value curto, ex.: "750 km").
reflect {type, question, sub?} — pergunta para a turma pensar.
alert {type, title, text} — aviso, erro comum, cuidado.
quote {type, text, author?} — citação que está no texto.
image {type, title, imageId, caption?} — só com um imageId da lista de figuras do trecho.
Todo slide pode ter também: notes (o que o professor diz) e source (fonte curta citada no texto, ex.: "Maul, p. 15").`;

const RULES = `Regras:
- Responda só com JSON válido, sem markdown.
- Uma ideia por slide. Pouco texto na tela, frases curtas, nada de parágrafo longo: o detalhe vai para notes.
- Títulos com até 60 caracteres; textos de cartão e itens com até 120 caracteres.
- Alterne os tipos; prefira cards, compare, steps, formula, bignumber, table e timeline a list. Evite dois slides seguidos do mesmo tipo quando houver alternativa.
- Fidelidade aos fatos: números, datas, autores, fontes e citações só como estão no texto; se o texto marca algo como "a conferir", mantenha a ressalva. Para ensinar bem, você PODE criar analogias do cotidiano, exemplos próximos da turma e contas resolvidas com os valores do texto, desde que cientificamente corretos e ligados ao conteúdo.
- Escreva como um bom professor projetaria: título que afirma algo (não só um rótulo), frase de impacto com uma ideia forte, cartões com conteúdo concreto e específico (nada de frase genérica), contas resolvidas passo a passo.
- Toda pergunta "Para refletir" (ou pergunta à turma) vira um slide reflect; nas notes desse slide escreva a RESPOSTA bem explicada e detalhada (1 a 3 parágrafos), com o raciocínio passo a passo.
- Avisos e erros comuns ("Atenção", "Dica") viram alert. Toda equação do texto (em LaTeX entre $$…$$ ou escrita) aparece num slide formula, convertida para texto simples com símbolos Unicode (x², 10⁻³, λ, σ⁰, θ, Δ, ·, ×, √). Exemplos numéricos viram calc (conta resolvida passo a passo), com a explicação completa nas notes.
- Use recursos visuais sempre que o conteúdo permitir: calc para contas, scale para escalas, faixas e espectros, chart para comparar valores do texto, cycle para processos que se repetem, steps para sequências, timeline para história, compare para contrastes, table para dados tabulares.
- notes (OBRIGATÓRIO em todo slide): o roteiro completo e detalhado do que o professor diz, de 90 a 220 palavras, em português do Brasil e tom de sala de aula: explica o conceito do slide com as palavras e os exemplos do texto, retoma números e contas passo a passo, antecipa a dúvida mais comum e fecha com a transição para o próximo slide. Nunca deixe notes vazia ou genérica.
- Se o slide traz QUALQUER pergunta (reflect, statement terminado em "?", pergunta em cards ou list), as notes terminam com "RESPOSTA:" seguida da resposta completa, bem explicada e detalhada (de 120 a 300 palavras), com o raciocínio passo a passo, as contas quando houver, os erros típicos e a ligação com o conteúdo.
- Cumpra exatamente a quantidade de slides pedida: se o trecho for curto, aprofunde (exemplo numérico, comparação, erro comum, pergunta para refletir) usando só o que está no texto; se for longo, condense.`;

const OUTLINE_SYSTEM = `Você é designer instrucional e de apresentações. Lê a aula inteira e planeja o deck de slides de conteúdo, em português do Brasil, antes de qualquer slide ser escrito.
Regras:
- Responda só com JSON válido, sem markdown.
- Planeje EXATAMENTE a quantidade pedida de slides, na ordem da aula; cada slide indica a seção de onde sai (sec, número da seção). Toda seção recebe pelo menos 1 slide; seções de glossário, resumo ou revisão recebem no máximo 1 (o deck já tem síntese).
- Não planeje capa, pergunta da aula, roteiro, objetivos, síntese final nem "pergunta que fica": esses slides já existem. Não repita a pergunta central da aula num slide.
- Nenhum conceito aparece duas vezes no deck. Cada slide avança a aula.
- Em cada seção, monte um arco: gancho ou exemplo concreto → conceito → fórmula ou conta resolvida (se houver) → erro comum ou atenção → pergunta para refletir quando o texto trouxer uma. Use os exemplos e lugares que estão no texto.
- Varie os tipos; nunca 3 slides seguidos do mesmo tipo. Use reflect para toda pergunta "Para refletir" do texto. Use image para as figuras listadas (imageId), cada uma no máximo uma vez.
- Toda equação listada em "Equações" (e toda fórmula escrita no texto) ganha seu slide formula; quando o texto traz valores para ela, planeje também um calc com a conta resolvida.
- Use os recursos visuais: calc (conta resolvida), scale (régua/espectro/faixas, como bandas ou dB), chart (barras com números do texto), cycle (processo cíclico), steps, timeline, compare, table, bignumber. Num deck bom, pelo menos metade dos slides é visual (não só texto em cartões).
- type: um de statement, cards, list, formula, calc, compare, steps, cycle, timeline, scale, chart, table, bignumber, reflect, alert, quote, image.
- title: o título do slide (até 60 caracteres), que afirma algo. idea: o que o slide mostra, com os dados, o exemplo ou a conta que deve usar (até 220 caracteres).
Formato: {"slides":[{"sec":1,"type":"…","title":"…","idea":"…","imageId":"img1"?}]}`;

const SECTION_SYSTEM = `Você é designer instrucional e de apresentações. Converte uma seção de uma aula em slides profissionais para projetar em sala, em português do Brasil.
${RULES}
${CATALOG}
Formato: {"slides":[ ... ]}`;

const FRAME_SYSTEM = `Você é designer instrucional. A partir dos títulos e do texto de uma aula, prepara a moldura da apresentação, em português do Brasil.
Regras:
- questionAnswer: a resposta completa à pergunta central, para as notas do professor, bem explicada e detalhada (150 a 300 palavras), com base só no texto.
- Responda só com JSON válido, sem markdown.
- question: a pergunta central que a aula responde, curta e instigante (até 90 caracteres). Se o texto já traz uma pergunta de abertura, use-a.
- objectives: 4 a 8 objetivos de aprendizagem, cada um com verb (um verbo no infinitivo, com inicial maiúscula, ex.: "Explicar") e text (o restante, até 80 caracteres, começando em minúscula). Se o texto lista objetivos, use-os; se estiverem truncados ou repetidos, reescreva com clareza, sem inventar conteúdo.
- synthesis: 3 a 6 ideias-síntese da aula, cada uma com title (até 32 caracteres, pode usar "→") e text (até 110 caracteres).
- closing: "a pergunta que fica", para o penúltimo slide de conteúdo: title (o conceito que a aula passa adiante, até 40 caracteres), question (uma pergunta aberta de aplicação ou transferência, que leva o conteúdo a um caso real, até 160 caracteres), hints (2 a 4 caminhos curtos para pensar nela, até 50 caracteres cada) e answer (orientação completa ao professor sobre como responder, de 200 a 400 palavras: os caminhos possíveis, o raciocínio, exemplos e os erros comuns).
- Fidelidade total ao texto: não invente conteúdo.
Formato: {"question":"…","questionAnswer":"…","objectives":[{"verb":"…","text":"…"}],"synthesis":[{"title":"…","text":"…"}],"closing":{"title":"…","question":"…","hints":["…"],"answer":"…"}}`;

const ANSWER_SYSTEM = `Você é professor e prepara as notas do apresentador de um slide que faz uma pergunta à turma, em português do Brasil.
Escreva a RESPOSTA completa, bem explicada e detalhada (de 150 a 350 palavras): a resposta direta primeiro; depois o raciocínio passo a passo, as contas completas quando houver, os erros típicos que a turma comete e a ligação com o conteúdo da aula. Use só o que está no texto de apoio e conhecimento científico consolidado; não invente dados, autores nem citações. Se faltar informação para uma resposta exata, diga o que seria preciso saber.
Responda só com JSON: {"answer":"…"}`;

const plain = (value) => String(value == null ? "" : value)
  .replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/[ \t]+/g, " ").trim();
const clip = (value, max) => { const t = plain(value); return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : t; };
const arr = (value) => (Array.isArray(value) ? value : []);
const notesOf = (value) => String(value == null ? "" : value).replace(/<[^>]*>/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, 3500);

export function normalizeSlide(raw, imageIds = []) {
  if (!raw || typeof raw !== "object") return null;
  const type = SLIDE_TYPES.includes(raw.type) ? raw.type : "";
  if (!type) return null;
  const base = { type, notes: notesOf(raw.notes), source: clip(raw.source, 90) };
  const pair = (x) => ({ title: clip(x && x.title, 60), text: clip(x && x.text, 160) });
  switch (type) {
    case "statement": { const text = clip(raw.text, 180); return text ? { ...base, eyebrow: clip(raw.eyebrow, 50), text, sub: clip(raw.sub, 180) } : null; }
    case "cards": { const items = arr(raw.items).map(pair).filter((x) => x.title || x.text).slice(0, 4); return items.length >= 2 ? { ...base, title: clip(raw.title, 70), items } : null; }
    case "list": { const items = arr(raw.items).map((x) => clip(typeof x === "string" ? x : x && (x.text || x.title), 140)).filter(Boolean).slice(0, 6); return items.length >= 2 ? { ...base, title: clip(raw.title, 70), items } : null; }
    case "formula": { const formula = clip(raw.formula, 60); return formula ? { ...base, title: clip(raw.title, 70), formula, legend: arr(raw.legend).map((x) => ({ sym: clip(x && x.sym, 12), text: clip(x && x.text, 100) })).filter((x) => x.sym || x.text).slice(0, 5), note: clip(raw.note, 200) } : null; }
    case "compare": { const side = (x) => ({ label: clip(x && x.label, 40), title: clip(x && x.title, 50), text: clip(x && x.text, 200) }); const left = side(raw.left), right = side(raw.right); return (left.title || left.text) && (right.title || right.text) ? { ...base, title: clip(raw.title, 70), left, right } : null; }
    case "steps": { const steps = arr(raw.steps).map(pair).filter((x) => x.title || x.text).slice(0, 5); return steps.length >= 2 ? { ...base, title: clip(raw.title, 70), steps } : null; }
    case "timeline": { const events = arr(raw.events).map((x) => ({ date: clip(x && x.date, 16), title: clip(x && x.title, 50), text: clip(x && x.text, 150) })).filter((x) => x.title || x.text).slice(0, 5); return events.length >= 2 ? { ...base, title: clip(raw.title, 70), events } : null; }
    case "table": {
      const headers = arr(raw.headers).map((h) => clip(h, 40)).slice(0, 4);
      const rows = arr(raw.rows).map((r) => arr(r).map((c) => clip(c, 60)).slice(0, 4)).filter((r) => r.some(Boolean)).slice(0, 7);
      return headers.length >= 2 && rows.length ? { ...base, title: clip(raw.title, 70), headers, rows: rows.map((r) => headers.map((_, i) => r[i] || "")) } : null;
    }
    case "bignumber": { const value = clip(raw.value, 24); return value ? { ...base, title: clip(raw.title, 70), value, label: clip(raw.label, 80), text: clip(raw.text, 200) } : null; }
    case "calc": { const steps = arr(raw.steps).map((x) => clip(typeof x === "string" ? x : x && (x.text || x.title), 90)).filter(Boolean).slice(0, 5); const result = clip(raw.result, 30); return steps.length && result ? { ...base, title: clip(raw.title, 70), given: arr(raw.given).map((x) => ({ sym: clip(x && x.sym, 14), text: clip(x && x.text, 80) })).filter((x) => x.sym || x.text).slice(0, 4), steps, result, unit: clip(raw.unit, 20) } : null; }
    case "cycle": { const steps = arr(raw.steps).map(pair).filter((x) => x.title).slice(0, 5); return steps.length >= 3 ? { ...base, title: clip(raw.title, 70), steps } : null; }
    case "scale": { const marks = arr(raw.marks).map((x) => ({ label: clip(x && x.label, 18), value: clip(x && x.value, 24), text: clip(x && x.text, 60) })).filter((x) => x.label).slice(0, 8); return marks.length >= 3 ? { ...base, title: clip(raw.title, 70), from: clip(raw.from, 40), to: clip(raw.to, 40), marks, note: clip(raw.note, 200) } : null; }
    case "chart": { const items = arr(raw.items).map((x) => ({ label: clip(x && x.label, 24), value: Number(String(x && x.value).replace(",", ".")) })).filter((x) => x.label && Number.isFinite(x.value)).slice(0, 8); return items.length >= 2 ? { ...base, title: clip(raw.title, 70), unit: clip(raw.unit, 20), items, note: clip(raw.note, 200) } : null; }
    case "reflect": { const question = clip(raw.question || raw.text, 220); return question ? { ...base, question, sub: clip(raw.sub, 160) } : null; }
    case "alert": { const text = clip(raw.text, 260); return text ? { ...base, title: clip(raw.title, 70) || "Atenção", text } : null; }
    case "quote": { const text = clip(raw.text, 260); return text ? { ...base, text, author: clip(raw.author, 80) } : null; }
    case "image": { const imageId = String(raw.imageId || "").trim(); return imageIds.includes(imageId) ? { ...base, title: clip(raw.title, 70), imageId, caption: clip(raw.caption, 160) } : null; }
    default: return null;
  }
}

export function normalizeFrame(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  return {
    question: clip(r.question, 120),
    questionAnswer: notesOf(r.questionAnswer),
    objectives: arr(r.objectives).map((o) => ({ verb: clip(o && o.verb, 20), text: clip(o && o.text, 110) })).filter((o) => o.verb && o.text).slice(0, 8),
    synthesis: arr(r.synthesis).map((s) => ({ title: clip(s && s.title, 40), text: clip(s && s.text, 140) })).filter((s) => s.title && s.text).slice(0, 6),
    closing: (() => { const c = r.closing && typeof r.closing === "object" ? r.closing : {}; return { title: clip(c.title, 60), question: clip(c.question, 200), hints: arr(c.hints).map((h) => clip(h, 70)).filter(Boolean).slice(0, 4), answer: notesOf(c.answer) }; })()
  };
}

function sectionMessages({ lessonTitle, sectionTitle, sectionIndex, sectionCount, part, text, images, count, avoid, outline = [], deck = [] }) {
  const figs = images.length ? images.map((im) => `[${im.id}] ${clip(im.caption || im.alt || "figura", 160)}`).join("\n") : "(nenhuma)";
  const avoidText = avoid.length ? `\nJá existem slides sobre (não repita, traga outros aspectos do texto):\n${avoid.map((t) => "- " + t).join("\n")}\n` : "";
  const planText = outline.length ? `\nPLANO A SEGUIR (um slide por item, nesta ordem, com o tipo indicado; troque o tipo só se o conteúdo não couber nele):\n${outline.map((o, i) => `${i + 1}. [${o.type}] ${o.title}${o.idea ? " — " + o.idea : ""}${o.imageId ? " (figura " + o.imageId + ")" : ""}`).join("\n")}\n` : "";
  const deckText = deck.length ? `\nO deck inteiro (para não repetir o que outros slides já cobrem):\n${deck.map((t) => "- " + t).join("\n")}\n` : "";
  return [
    { role: "system", content: SECTION_SYSTEM },
    { role: "user", content: `Aula: "${clip(lessonTitle, 160)}".\nSeção ${sectionIndex} de ${sectionCount}: "${clip(sectionTitle, 120)}"${part ? ` (${clip(part, 40)})` : ""}.\nGere EXATAMENTE ${count} slide(s) para este trecho, nem mais nem menos (não repita o título da seção como slide isolado), cada um com notes completas.${planText}${deckText}${avoidText}\nFiguras disponíveis no trecho:\n${figs}\n\nTexto do trecho:\n${String(text).slice(0, 14000)}` }
  ];
}

export async function slidesForSection(body = {}, { ask = callJson } = {}) {
  const text = String(body.text || "").trim();
  if (text.length < 40) { const error = new Error("A seção não tem texto suficiente para virar slides."); error.code = "SLIDES_TEXT_MISSING"; throw error; }
  const images = arr(body.images).map((im) => ({ id: String(im && im.id || "").slice(0, 20), caption: im && im.caption, alt: im && im.alt })).filter((im) => im.id).slice(0, 12);
  // Quantidade exata (count); min/max ficam por compatibilidade com o ClassAtelier 1.19.0.
  const legacy = Number.parseInt(body.max, 10) || Number.parseInt(body.min, 10) || 4;
  const count = Math.max(1, Math.min(10, Number.parseInt(body.count, 10) || legacy));
  const avoid = arr(body.avoid).map((t) => clip(t, 80)).filter(Boolean).slice(0, 30);
  const outline = arr(body.outline).map(normalizeOutlineItem).filter(Boolean).slice(0, 10);
  const deck = arr(body.deck).map((t) => clip(t, 80)).filter(Boolean).slice(0, 160);
  const n = outline.length ? Math.min(10, outline.length) : count;
  const messages = sectionMessages({ lessonTitle: body.lessonTitle, sectionTitle: body.sectionTitle, sectionIndex: Number(body.sectionIndex) || 1, sectionCount: Number(body.sectionCount) || 1, part: body.part, text, images, count: n, avoid, outline, deck });
  const raw = await ask(messages, { temperature: 0.4, maxTokens: Math.min(16000, 2000 + n * 1300), label: "slides-section", ignoreRequestBudget: true, cacheSystem: true });
  const ids = images.map((im) => im.id);
  const slides = arr(raw && raw.slides).map((s) => normalizeSlide(s, ids)).filter(Boolean).slice(0, n);
  if (!slides.length) { const error = new Error("A IA não devolveu slides válidos para esta seção."); error.code = "SLIDES_INVALID"; error.retryable = true; throw error; }
  return { slides };
}

function normalizeOutlineItem(o) {
  if (!o || typeof o !== "object") return null;
  const type = SLIDE_TYPES.includes(o.type) ? o.type : "cards";
  const title = clip(o.title, 90);
  if (!title) return null;
  return { type, title, idea: clip(o.idea, 260), ...(o.imageId ? { imageId: String(o.imageId).slice(0, 20) } : {}) };
}

// Plano do deck inteiro: a IA lê a aula toda e distribui a quantidade pedida entre as seções,
// sem repetir conceito. Cada item diz a seção (sec, a partir de 1), o tipo, o título e a ideia.
export async function slidesOutline(body = {}, { ask = callJson } = {}) {
  const sections = arr(body.sections).map((s) => ({ title: clip(s && s.title, 120), text: String((s && s.text) || ""), equations: arr(s && s.equations).map((e) => String(e || "").slice(0, 200)).filter(Boolean).slice(0, 20), images: arr(s && s.images).map((im) => ({ id: String(im && im.id || "").slice(0, 20), caption: clip(im && (im.caption || im.alt), 140) })).filter((im) => im.id).slice(0, 12) })).filter((s) => s.title || s.text).slice(0, 40);
  if (!sections.length) { const error = new Error("A aula não tem seções para planejar os slides."); error.code = "SLIDES_TEXT_MISSING"; throw error; }
  const count = Math.max(sections.length, Math.min(150, Number.parseInt(body.count, 10) || 20));
  const budget = 60000; const total = sections.reduce((a, s) => a + s.text.length, 0) || 1;
  const parts = sections.map((s, i) => {
    const room = Math.max(1500, Math.floor(budget * s.text.length / total));
    const figs = s.images.length ? `\nFiguras: ${s.images.map((im) => `[${im.id}] ${im.caption || "figura"}`).join("; ")}` : "";
    const eqs = s.equations.length ? `\nEquações (todas precisam aparecer em slides formula): ${s.equations.map((e) => "$$" + e + "$$").join("  ")}` : "";
    return `### Seção ${i + 1}: ${s.title}${figs}${eqs}\n${s.text.slice(0, room)}`;
  });
  const messages = [
    { role: "system", content: OUTLINE_SYSTEM },
    { role: "user", content: `Aula: "${clip(body.lessonTitle, 160)}". Planeje EXATAMENTE ${count} slides de conteúdo para estas ${sections.length} seções.\n\n${parts.join("\n\n")}` }
  ];
  const raw = await ask(messages, { temperature: 0.3, maxTokens: Math.min(20000, 2500 + count * 160), label: "slides-outline", ignoreRequestBudget: true });
  const n = sections.length;
  const slides = arr(raw && raw.slides).map((o) => { const item = normalizeOutlineItem(o); if (!item) return null; const sec = Math.min(n, Math.max(1, Number.parseInt(o.sec, 10) || 1)); return { sec, ...item }; }).filter(Boolean).slice(0, count);
  if (slides.length < Math.ceil(count * 0.6)) { const error = new Error("A IA não devolveu o plano dos slides."); error.code = "SLIDES_INVALID"; error.retryable = true; throw error; }
  return { outline: slides };
}

export async function slidesFrame(body = {}, { ask = callJson } = {}) {
  const titles = arr(body.sectionTitles).map((t) => clip(t, 120)).filter(Boolean).slice(0, 30);
  const text = String(body.text || "").trim().slice(0, 16000);
  if (!titles.length && text.length < 40) { const error = new Error("A aula não tem texto suficiente para a moldura dos slides."); error.code = "SLIDES_TEXT_MISSING"; throw error; }
  const messages = [
    { role: "system", content: FRAME_SYSTEM },
    { role: "user", content: `Aula: "${clip(body.lessonTitle, 160)}".\nSeções:\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nTexto da aula (trechos):\n${text}` }
  ];
  const raw = await ask(messages, { temperature: 0.3, maxTokens: 5000, label: "slides-frame", ignoreRequestBudget: true });
  return normalizeFrame(raw);
}

// Resposta detalhada para um slide que faz uma pergunta (quando as notes vieram sem ela).
export async function slideAnswer(body = {}, { ask = callJson } = {}) {
  const question = clip(body.question, 400);
  if (question.length < 5) { const error = new Error("Falta a pergunta do slide."); error.code = "SLIDES_TEXT_MISSING"; throw error; }
  const messages = [
    { role: "system", content: ANSWER_SYSTEM },
    { role: "user", content: `Aula: "${clip(body.lessonTitle, 160)}".\nPergunta do slide: ${question}\n\nTexto de apoio (trecho da aula):\n${String(body.context || "").slice(0, 9000)}` }
  ];
  const raw = await ask(messages, { temperature: 0.3, maxTokens: 3000, label: "slides-answer", ignoreRequestBudget: true, cacheSystem: true });
  const answer = notesOf(raw && raw.answer);
  if (answer.length < 40) { const error = new Error("A IA não devolveu a resposta."); error.code = "SLIDES_INVALID"; error.retryable = true; throw error; }
  return { answer };
}
