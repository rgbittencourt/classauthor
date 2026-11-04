// Referências no padrão ABNT NBR 6023.
// O modelo escreve a referência completa; aqui ficam as regras que vão para os prompts, o motor que monta
// a referência a partir de campos (autor, título, edição...), as correções seguras de uma referência já escrita,
// a ordenação alfabética exigida pela norma e uma conferência simples (formato, não verdade).
// Este arquivo é copiado para public/abnt.js e, como script comum, para o ClassAtelier (abnt.js): mantenha os três iguais.

const MONTHS = ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const MONTH_KEYS = [["janeiro", "jan"], ["fevereiro", "fev"], ["marco", "mar"], ["abril", "abr"], ["maio", "mai"], ["junho", "jun"], ["julho", "jul"], ["agosto", "ago"], ["setembro", "set", "sept"], ["outubro", "out"], ["novembro", "nov"], ["dezembro", "dez"]];

const clean = (value) => String(value == null ? "" : value).replace(/\s+/g, " ").trim();
const noAccent = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "");

export function abntToday(date = new Date()) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// Mês abreviado pela norma: 3 letras e ponto (jan., fev., mar...), exceto maio, por extenso.
// Aceita número (1 a 12), nome inteiro, abreviação com ou sem ponto, com ou sem acento. Devolve "" se não reconhecer.
export function abntMonth(value) {
  if (typeof value === "number" && value >= 1 && value <= 12) return MONTHS[value - 1];
  const key = noAccent(clean(value)).toLowerCase().replace(/\.$/, "");
  if (/^\d{1,2}$/.test(key) && Number(key) >= 1 && Number(key) <= 12) return MONTHS[Number(key) - 1];
  const index = MONTH_KEYS.findIndex((names) => names.includes(key));
  return index < 0 ? "" : MONTHS[index];
}

export function abntRules(today = abntToday()) {
  return `REFERÊNCIAS NO PADRÃO ABNT NBR 6023:2025 (3ª edição, 21/05/2025) — obrigatório, sem exceção:
NOMES (autor):
- pessoa física: último sobrenome em MAIÚSCULAS, vírgula e prenome(s): "Florestan Fernandes" vira FERNANDES, Florestan (Filho, Neto, Júnior e Sobrinho acompanham o sobrenome: SILVA FILHO, João);
- de 1 a 3 autores, todos, separados por ponto e vírgula e espaço ("; "): SOBRENOME, Nome; SOBRENOME, Nome; com 4 ou mais, só o primeiro seguido de et al., sem itálico;
- entidade ou instituição: nome em MAIÚSCULAS (UNIVERSIDADE FEDERAL DE SANTA CATARINA);
- obra sem autor: entra pelo título, com a primeira palavra (e o artigo que a antecede) em MAIÚSCULAS e SEM negrito.
DESTAQUE: negrito (** **) só no título do documento (livro, relatório, página); em artigo de revista ou de jornal e em matéria de portal, o negrito vai no nome do periódico ou do portal, e o título do artigo fica sem destaque; em lei, o negrito cobre a denominação inteira ("Lei nº 14.533, de 11 de janeiro de 2023"). Nunca no subtítulo, que vem depois de dois-pontos. Sempre do mesmo jeito em todas as referências.
MODELOS:
- livro: AUTOR. **Título**: subtítulo. 2. ed. Local: Editora, ano. (1ª edição: omita a edição);
- capítulo: AUTOR DO CAPÍTULO. Título do capítulo. In: AUTOR DA OBRA (Org.). **Título da obra**. Local: Editora, ano. p. 10-25.
- artigo: AUTOR. Título do artigo. **Nome do periódico**, local, v. 10, n. 2, p. 15-30, mar. 2020.
- matéria de portal ou de jornal: AUTOR. Título da matéria. **Nome do portal**, 6 abr. 2023. Disponível em: https://…. Acesso em: ${today}.
- site ou documento online: AUTOR ou ENTIDADE. **Título**. Local: Editora, ano. Disponível em: https://…. Acesso em: ${today}.
- lei, decreto, norma: JURISDIÇÃO. **Lei nº 14.533, de 11 de janeiro de 2023**. Ementa. Local: Órgão, ano. Disponível em: https://…. Acesso em: ${today}.
- local e editora desconhecidos: [S. l.: s. n.], ano. Só o local desconhecido: [S. l.]: Editora, ano. Só a editora: Local: [s. n.], ano.
DATAS: mês abreviado com 3 letras e ponto (jan., fev., mar., abr., jun., jul., ago., set., out., nov., dez.), exceto maio, que se escreve por extenso. Dia sem zero à esquerda ("5 mar. 2026").
FONTE ONLINE termina com "Disponível em: URL. Acesso em: ${today}." — a URL SEM os sinais < >, somente quando a URL foi informada; nunca invente URL, DOI, páginas, volume, editora, local ou data: se faltar um elemento essencial, escreva a referência com o que você sabe com segurança, ponha [ano] no lugar do ano que não souber e liste o que conferir em "Pontos a conferir".
LISTA: uma referência por linha, alinhada à esquerda, sem marcadores nem números, em ordem alfabética pelo primeiro elemento (SOBRENOME do primeiro autor ou ENTIDADE); sem texto antes ou depois da lista.`;
}

const strip = (value) => String(value || "").replace(/<[^>]+>/g, "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();

export function abntSortKey(reference) {
  const item = typeof reference === "string" ? reference : reference?.citation || reference?.title || reference?.href || "";
  return strip(item).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

// Ordem alfabética (NBR 6023), estável: referências sem chave ficam no fim.
export function sortReferencesAbnt(references) {
  const list = Array.isArray(references) ? references : [];
  return list.map((item, index) => ({ item, index, key: abntSortKey(item) }))
    .sort((a, b) => (a.key && !b.key ? -1 : !a.key && b.key ? 1 : a.key.localeCompare(b.key, "pt-BR") || a.index - b.index))
    .map((entry) => entry.item);
}

// Conferência de forma: devolve o que falta para a referência parecer ABNT. Não verifica se a obra existe.
// Entrada pelo título (obra sem autor): o título em negrito e a primeira palavra em maiúsculas.
const TITLE_ENTRY = /^\[?(?:(?:O|A|OS|AS|UM|UMA)\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9]{2,}/;

export function abntIssues(reference) {
  const item = typeof reference === "string" ? { citation: reference } : reference || {};
  const raw = String(item.citation || item.title || "");
  const plainText = strip(raw);
  const issues = [];
  if (!plainText) return issues;
  if (!/^(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ'’ -]+[,.]|[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}\b)/.test(plainText) && !TITLE_ENTRY.test(plainText)) issues.push("deve começar por SOBRENOME, Nome (ou ENTIDADE em maiúsculas)");
  if (/\[t[ií]tulo\]/i.test(plainText)) issues.push("falta o título: troque [título] pelo título da obra");
  if (/\[ano\]/.test(plainText)) issues.push("falta o ano: troque [ano] pelo ano de publicação");
  else if (!/\b(1[5-9]\d{2}|20\d{2})\b/.test(plainText)) issues.push("falta o ano");
  if (!/\*\*[^*]+\*\*/.test(raw) && leadInfo(plainText)) issues.push("falta o destaque (negrito) no título");
  if (/\*\*[^*:]+:\s+[^*]+\*\*/.test(raw)) issues.push("o negrito vai só no título principal, não no subtítulo");
  else if (/\*\*/.test(raw) && !boldIsSound(raw)) issues.push("o negrito vai só no título, não na referência inteira nem no autor ou na editora");
  const leading = plainText.split(/;\s+/);
  let authors = 0;
  while (authors < leading.length && /^\p{Lu}[\p{Lu}'’ -]+,\s/u.test(leading[authors])) authors += 1;
  if (authors >= 4) issues.push("com 4 ou mais autores, use só o primeiro seguido de et al.");
  if (/(?<!\*)[*_]et al\.?[*_](?!\*)|<(?:em|i)>\s*et al/i.test(raw)) issues.push("et al. sem itálico");
  if (/\((?:orgs?|Org|ORG|organizador(?:es)?)\)|\((?:orgs?)\.\)/.test(raw)) issues.push('organizador se escreve "(Org.)"');
  if (/(?:^|[.:*]\s+)1\s*[ªº.]?\s*ed\b/i.test(plainText)) issues.push("1ª edição não se indica");
  if (/(?:^|[.:*]\s+)(?:[2-9]|\d{2})\s*[ªº]\s*ed|(?:^|[.:*]\s+)(?:[2-9]|\d{2})\s+ed\b/i.test(plainText)) issues.push('edição se escreve "2. ed."');
  const hasUrl = /https?:\/\//i.test(plainText) || /^https?:\/\//i.test(String(item.href || ""));
  if (hasUrl && !/Dispon[ií]vel em:/i.test(plainText)) issues.push('fonte online sem "Disponível em: URL."');
  if (/Dispon[ií]vel em:\s*(?:<|&lt;)|(?:<|&lt;)https?:/i.test(raw)) issues.push("na NBR 6023:2025 o endereço vem sem os sinais < >");
  if (/\[dia mês ano\]/.test(plainText)) issues.push("falta a data de acesso: troque [dia mês ano] pela data em que você abriu o link");
  else if (/Dispon[ií]vel em:/i.test(plainText) && !/Acesso em:/i.test(plainText)) issues.push('falta "Acesso em: data."');
  const access = plainText.match(/Acesso em:\s*(\d{1,2})\s+([\p{L}]+\.?)\s+(\d{4})/u);
  if (access && (abntMonth(access[2]) === "" || abntMonth(access[2]) !== access[2] || /^0/.test(access[1]))) issues.push('data de acesso no formato "5 mar. 2026" (maio por extenso)');
  return issues;
}

export function abntReport(references) {
  const list = Array.isArray(references) ? references : [];
  const flagged = list.map((reference, index) => ({ index, issues: abntIssues(reference) })).filter((entry) => entry.issues.length);
  return { total: list.length, flagged };
}

// ───────────────────────── Motor de formatação (NBR 6023) ─────────────────────────
// formatAbnt monta a referência a partir de campos. Os nomes dos campos seguem a norma:
//   autores (lista ou texto com ";"), entidade (true se o autor é instituição), titulo, subtitulo, edicao, local, editora, ano,
//   capitulo (título do capítulo), obraAutores, organizador (true: "(Org.)"), paginas ("10-25"),
//   revista, volume, numero, mes, url, doi, acesso (data do acesso; padrão: hoje).
// tipo: "livro" | "capitulo" | "artigo" | "site" (se faltar, é deduzido dos campos).

const ENTITY_WORDS = /\b(universidade|instituto|minist[eé]rio|secretaria|conselho|associa[cç][aã]o|funda[cç][aã]o|organiza[cç][aã]o|sociedade|federa[cç][aã]o|confedera[cç][aã]o|c[aâ]mara|senado|tribunal|governo|prefeitura|comiss[aã]o|departamento|ag[eê]ncia|escola|col[eé]gio|laborat[oó]rio|rede|empresa|banco|brasil|unesco|ibge|inep|capes|cnpq|university|institute|ministry|organization|council|association)\b/i;
const NAME_SUFFIX = /^(filho|filha|neto|neta|j[uú]nior|sobrinho|sobrinha|netto)$/i;

export function abntPerson(raw) {
  const text = clean(raw).replace(/\.$/, "");
  if (!text) return "";
  if (text.includes(",")) {
    const [surname, ...given] = text.split(",");
    return `${surname.trim().toUpperCase()}, ${clean(given.join(","))}`.replace(/, $/, "");
  }
  const words = text.split(" ");
  if (words.length === 1) return text.toUpperCase();
  const take = words.length > 2 && NAME_SUFFIX.test(words[words.length - 1]) ? 2 : 1;
  return `${words.slice(-take).join(" ").toUpperCase()}, ${words.slice(0, -take).join(" ")}`;
}

export function abntEntity(raw) {
  return clean(raw).replace(/\.$/, "").toUpperCase();
}

function authorList(value) {
  if (Array.isArray(value)) return value.map((item) => clean(typeof item === "object" ? item?.name || item?.nome : item)).filter(Boolean);
  return String(value || "").split(/\s*;\s*|\n/).map(clean).filter(Boolean);
}

// R1: 1 a 3 autores separados por "; "; 4 ou mais: o primeiro e "et al.". Entidade em MAIÚSCULAS.
export function abntAuthors(value, { entity } = {}) {
  let list = authorList(value);
  let etAl = false;
  list = list.filter((name) => { if (/^et al\.?$/i.test(name)) { etAl = true; return false; } return true; });
  if (!list.length) return "";
  const format = (name) => {
    const isEntity = entity === true || (entity !== false && !name.includes(",") && (ENTITY_WORDS.test(name) || (/^[\p{Lu}0-9 .'’&-]+$/u.test(name) && !/ /.test(name))));
    return isEntity ? abntEntity(name) : abntPerson(name);
  };
  if (list.length >= 4 || (etAl && list.length >= 1)) return `${format(list[0])} et al.`;
  return list.map(format).join("; ");
}

const endsWithMark = (value) => /[.?!]$/.test(value);
const withPeriod = (value) => (endsWithMark(value) ? value : `${value}.`);
const pages = (value) => clean(value).replace(/^p(?:p|[áa]g(?:s|inas?)?)?\.?\s*/i, "").replace(/\s*(?:–|—|a|à|até)\s*/g, "-").replace(/\s+/g, "");
const edition = (value) => {
  const n = clean(value).match(/\d+/);
  return !n || Number(n[0]) <= 1 ? "" : `${Number(n[0])}. ed.`;
};

function accessDate(value, today) {
  if (value instanceof Date) return abntToday(value);
  const text = clean(value);
  if (!text) return today || abntToday();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${Number(iso[3])} ${MONTHS[Number(iso[2]) - 1]} ${iso[1]}`;
  const loose = text.match(/^(\d{1,2})\s*(?:de\s+)?([\p{L}]+)\.?\s*(?:de\s+)?(\d{4})\.?$/u);
  if (loose && abntMonth(loose[2])) return `${Number(loose[1])} ${abntMonth(loose[2])} ${loose[3]}`;
  return text.replace(/\.$/, "");
}

function digital(entry, today) {
  let url = clean(entry.url || entry.href);
  const doi = clean(entry.doi).replace(/^doi:\s*/i, "");
  if (!url && doi) url = /^https?:/i.test(doi) ? doi : `https://doi.org/${doi}`;
  url = url.replace(/^<|>$/g, "").replace(/\.$/, "");
  return url ? `Disponível em: ${url}. Acesso em: ${accessDate(entry.acesso, today)}.` : "";
}

function placeAndYear(entry) {
  const local = clean(entry.local);
  const editora = clean(entry.editora);
  const ano = clean(entry.ano) || "[ano]";
  if (!local && !editora) return `[S. l.: s. n.], ${ano}.`;
  return `${local || "[S. l.]"}: ${editora || "[s. n.]"}, ${ano}.`;
}

function guessType(entry) {
  const type = noAccent(clean(entry.tipo)).toLowerCase();
  if (/^(livro|capitulo|artigo|site)$/.test(type)) return type;
  if (clean(entry.revista)) return "artigo";
  if (clean(entry.capitulo)) return "capitulo";
  if ((clean(entry.url) || clean(entry.doi)) && !clean(entry.editora)) return "site";
  return "livro";
}

function titleBlock(entry) {
  const title = clean(entry.titulo);
  const sub = clean(entry.subtitulo);
  return `**${title}**${sub ? `: ${sub}` : ""}`;
}

export function formatAbnt(entry = {}, { today } = {}) {
  const type = guessType(entry);
  const authors = abntAuthors(entry.autores ?? entry.autor, { entity: entry.entidade });
  const lead = (value) => (value ? `${withPeriod(value)} ` : "");
  let out = "";
  if (type === "capitulo") {
    const work = abntAuthors(entry.obraAutores ?? entry.organizadores, { entity: entry.obraEntidade });
    const inPart = work ? `In: ${work}${entry.organizador === false ? "" : " (Org.)"}. ` : "In: ";
    const range = pages(entry.paginas);
    out = `${lead(authors)}${withPeriod(clean(entry.capitulo))} ${inPart}**${clean(entry.titulo)}**. ${placeAndYear(entry)}${range ? ` p. ${range}.` : ""}`;
  } else if (type === "artigo") {
    const issue = [clean(entry.local), clean(entry.volume) && `v. ${clean(entry.volume)}`, clean(entry.numero) && `n. ${clean(entry.numero)}`, pages(entry.paginas) && `p. ${pages(entry.paginas)}`].filter(Boolean);
    const month = abntMonth(entry.mes);
    const when = [month, clean(entry.ano)].filter(Boolean).join(" ") || "[ano]";
    out = `${lead(authors)}${withPeriod(clean(entry.titulo))} **${clean(entry.revista)}**, ${issue.concat(when).join(", ")}.`;
  } else if (type === "site") {
    out = `${lead(authors)}${withPeriod(titleBlock(entry))} ${placeAndYear(entry)}`;
  } else {
    const ed = edition(entry.edicao);
    out = `${lead(authors)}${withPeriod(titleBlock(entry))} ${ed ? `${ed} ` : ""}${placeAndYear(entry)}`;
  }
  if (!authors) out = out.replace(/^(\*\*)?(\p{L}+)/u, (all, mark, word) => `${mark || ""}${word.toUpperCase()}`);
  const online = digital(entry, today);
  return clean(`${out} ${online}`);
}

// Lista de referências pronta: ordem alfabética e uma linha em branco entre elas, sem marcadores, tudo à esquerda.
export function formatAbntList(entries = [], options = {}) {
  const list = (Array.isArray(entries) ? entries : []).map((entry) => (typeof entry === "string" ? entry : formatAbnt(entry, options))).filter(Boolean);
  return sortReferencesAbnt(list).join("\n\n");
}

// ───────────────────── Correções seguras de uma referência já escrita ─────────────────────
// Só mexe no que a norma decide sem ambiguidade; o resto fica para a conferência (abntIssues).
const AUTH = "\\p{Lu}[\\p{Lu}'’ -]*,\\s+(?:(?:\\p{Lu}\\.\\s?)+|[\\p{L}'’-]+(?:\\s+(?:\\p{Lu}\\.|[\\p{L}'’-]+))*)";
const MANY_AUTHORS = new RegExp(`^(${AUTH})(?:;\\s*${AUTH}){3,}\\.?(?=\\s)`, "u");

// ───── Inferência da estrutura: autor fora do formato e título sem negrito ─────
// A referência tem uma ordem fixa (autor. título. [edição.] local: editora, ano.), então dá para achar o título, o
// periódico ou a obra sem a IA. Só mexe quando a estrutura é clara; do contrário deixa como está e a conferência avisa.
const DOT = "\u0001";
const protectDots = (text) => text
  .replace(/(?<!\p{L})(?:et al|ed|v|n|p|pp|vol|org|coord|cap)\./giu, (m) => m.replace(".", DOT))
  .replace(/(?<!\p{L})(?:jan|fev|mar|abr|jun|jul|ago|set|out|nov|dez)\./giu, (m) => m.replace(".", DOT))
  .replace(/(?<!\p{L})[Ss]\. ?[lnd]\./gu, (m) => m.replace(/\./g, DOT))
  .replace(/(\d+)\.(?=\s+ed\b)/gu, `$1${DOT}`)
  .replace(/(?<!\p{L})\p{Lu}\./gu, (m) => m.replace(".", DOT));

function segments(text) {
  const prot = protectDots(text);
  const out = [];
  let start = 0;
  const re = /\.(?:\s+|$)/g;
  let m;
  while ((m = re.exec(prot))) { out.push({ s: start, e: m.index, t: text.slice(start, m.index) }); start = m.index + m[0].length; }
  if (start < text.length) out.push({ s: start, e: text.length, t: text.slice(start) });
  return out;
}

const AUTH_LOOSE = "\\p{Lu}[\\p{L}'’ -]*,\\s+(?:(?:\\p{Lu}\\.\\s?)+|\\p{Lu}[\\p{L}'’-]*(?:\\s+(?:\\p{Lu}\\.|[\\p{L}'’-]+))*)";
const NAME_WORD = "\\p{Lu}[\\p{L}'’-]+|\\p{Lu}\\.";
const NAME = `(?:${NAME_WORD})(?:\\s+(?:${NAME_WORD}|d[aeo]s?|e|van|von|di|del|la|le))*`;
const PERSON_LEAD = new RegExp(`^(${AUTH}(?:;\\s*${AUTH})*)\\.?(?=\\s|$)`, "u");
const ENTITY_LEAD = /^([\p{Lu}0-9][\p{Lu}0-9 '’&()/-]{2,}?)\.(?=\s)/u;
const LOOSE_LEAD = new RegExp(`^(${AUTH_LOOSE}(?:;\\s*${AUTH_LOOSE})*)(?:\\.(?=\\s)|(?<=\\p{Lu}\\.)(?=\\s))`, "u");
const NAME_LEAD = new RegExp(`^(${NAME}(?:(?:;\\s*|\\s+e\\s+|\\s+&\\s+)${NAME})*)\\.(?=\\s)`, "u");
const PLACE = /^(?:\d{1,2}\. ed\. )?[^:*]{2,45}:\s+[^,*]{1,100},\s*(?:\d{4}|\[s\. ?d\.\]|s\. ?d\.)/u;
const PLACE_NO_YEAR = /^(?:\d{1,2}\. ed\. )?[^:*,]{2,45}:\s+[^,*:]{1,100}$/u;
const PLACE_YEAR = /^[\p{Lu}][^:*,.]{1,40},\s*(?:\d{4}|\[s\. ?d\.\]|s\. ?d\.)/u;
const SUB_ENTITY = /^(?:Minist|Secretaria|Conselho|Instituto|Universidade|Coordena|Departamento|Funda|Comiss|C[aâ]mara|Senado|Tribunal|Governo|Prefeitura)/iu;
const LAW = /^((?:Lei Complementar|Lei|Decreto-Lei|Decreto|Portaria|Resolu[cç][aã]o|Parecer|Medida Provisória|Emenda Constitucional|Instru[cç][aã]o Normativa)\s+(?:n\.?\s?[ºo°]?\s*|nº\s*|número\s*)?[\d][\d.\/-]*)/iu;

function leadInfo(text) {
  const m = PERSON_LEAD.exec(text) || ENTITY_LEAD.exec(text);
  return m ? { end: m[0].length } : null;
}

function boldSpan(text, s, e) {
  const seg = text.slice(s, e);
  const colon = seg.search(/:\s/);
  const end = colon > 0 ? s + colon : e;
  return `${text.slice(0, s)}**${text.slice(s, end)}**${text.slice(end)}`;
}

function inferBold(text) {
  if (/\*\*[^*]+\*\*/.test(text)) return text;
  const lead = leadInfo(text);
  if (!lead) return text;
  const offset = lead.end + (text.slice(lead.end).length - text.slice(lead.end).trimStart().length);
  const segs = segments(text.slice(offset));
  if (!segs.length) return text;
  const at = (i) => (segs[i] ? segs[i].t : "");
  const bold = (i) => boldSpan(text, offset + segs[i].s, offset + segs[i].e);
  const inAt = segs.findIndex((seg) => /^In:\s/.test(seg.t));
  if (inAt >= 0) return PLACE.test(at(inAt + 2)) ? bold(inAt + 1) : text;
  const journal = segs.findIndex((seg, i) => i >= 1 && (/^[^,*]+,.*(?:^|[\s,])(?:v|n|p)\.\s*\d/.test(seg.t) || /^[^,*]+,\s*\d{1,2}\s+\p{L}{3,9}\.?\s+(?:19|20)\d{2}$/u.test(seg.t)));
  if (journal >= 1) { const s0 = offset + segs[journal].s; return boldSpan(text, s0, s0 + segs[journal].t.indexOf(",")); }
  const law = LAW.exec(at(0));
  if (law) {
    const dated = /^,\s+de\s+\d{1,2}(?:º|°)?\s+de\s+\p{L}+\s+de\s+\d{4}/u.exec(at(0).slice(law[1].length));
    const span = law[1] + (dated ? dated[0] : "");
    const s0 = offset + segs[0].s;
    return `${text.slice(0, s0)}**${span}**${text.slice(s0 + span.length)}`;
  }
  if (PLACE.test(at(1)) || (segs.length === 2 && PLACE_NO_YEAR.test(at(1)))) return bold(0);
  if (SUB_ENTITY.test(at(0)) && (PLACE.test(at(2)) || PLACE_YEAR.test(at(2)))) return bold(1);
  if (PLACE_YEAR.test(at(1))) return bold(0);
  if (!PLACE.test(at(1)) && /^(?:\d{4}|\[s\. ?d\.\]|Dispon)/i.test(at(1))) return bold(0);
  if (segs.length === 1 && !/Dispon/i.test(at(0))) {
    const only = at(0);
    const lastComma = /^(.+),\s*(?:19|20)\d{2}$/u.exec(only);
    if (lastComma) {
      // Modelo T4 (site, matéria): "AUTOR. **Título**. Ano." (ponto, não vírgula, antes do ano)
      const year = /((?:19|20)\d{2})$/.exec(only)[1];
      const next = `${text.slice(0, offset + segs[0].s)}${lastComma[1]}. ${year}${text.slice(offset + segs[0].e)}`;
      return boldSpan(next, offset + segs[0].s, offset + segs[0].s + lastComma[1].length);
    }
    const dated = /^([^,]+),\s.*(?:19|20)\d{2}$/u.exec(only);
    if (dated) {
      const s0 = offset + segs[0].s;
      const next = `${text.slice(0, s0)}${dated[1]}.${text.slice(s0 + dated[1].length + 1)}`;
      return boldSpan(next, s0, s0 + dated[1].length);
    }
    if (!/,/.test(only) && only.split(/\s+/).length >= 2) return bold(0);
  }
  return text;
}

// Autor escrito fora do formato ("Paulo Freire.", "Silva, Ana.", "Ana Souza e Bia Lima."): só vira SOBRENOME, Nome quando
// o resto da referência confirma a estrutura (título e local/editora/ano); do contrário o texto fica como está.
function fixAuthorLead(text) {
  if (leadInfo(text)) return text;
  const m = LOOSE_LEAD.exec(text) || NAME_LEAD.exec(text);
  if (!m) return text;
  const rest = text.slice(m[0].length).trim();
  if (!rest) return text;
  const authors = abntAuthors(m[1].split(/\s*;\s*|\s+e\s+|\s+&\s+/).map(clean).filter(Boolean));
  if (!authors) return text;
  const candidate = `${authors}${authors.endsWith(".") ? "" : "."} ${rest}`;
  return /^\*\*[^*]+\*\*/.test(rest) || inferBold(candidate) !== candidate ? candidate : text;
}


// ---- Limpeza de erros de digitação e de formato antes da inferência ----
const SMALL = /^(?:e|de|da|do|das|dos|di|du|del|la|le|von|van|y)$/i;
const cap = (word) => (word ? word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1).toLocaleLowerCase("pt-BR") : word);
const nameCase = (value) => value.split(/(\s+)/).map((w, i) => (/^\s+$/.test(w) ? w : i > 0 && SMALL.test(w) ? w.toLowerCase() : cap(w))).join("");

// Espaços e pontuação: "autonomia .São Paulo :Paz e Terra ,1996" -> "autonomia. São Paulo: Paz e Terra, 1996".
function tidyPunctuation(text) {
  const keep = [];
  let out = text.replace(/(?:https?:\/\/|www\.)[^\s<>]+|\b10\.\d{4,}\/\S+/g, (u) => { keep.push(u); return `\u0001${keep.length - 1}\u0001`; });
  out = out.replace(/\*\*([^*]+)\*\*/g, (all, inner) => `**${inner.trim()}**`);
  out = out.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1");
  out = out.replace(/([,;:])(?=\p{L})/gu, "$1 ").replace(/(?<=\p{L})([,;:])(?=\d)/gu, "$1 ").replace(/(?<=\p{Ll}{2})\.(?=\p{Lu})/gu, ". ");
  return out.replace(/\u0001(\d+)\u0001/g, (all, i) => keep[Number(i)]);
}

// Caixa: autor em minúsculas ou com o nome em MAIÚSCULAS, referência toda em minúsculas, título todo em maiúsculas.
function fixCase(text) {
  let out = text;
  if (!/\p{Lu}/u.test(out) && /:\s*[^,]+,\s*\d{4}/.test(out)) {
    out = out.replace(/^([\p{Ll}'’ -]+),\s*([\p{Ll}][\p{Ll}. ]*?)(?=[.;])/u, (all, sur, name) => `${sur.toLocaleUpperCase("pt-BR")}, ${nameCase(name)}`);
    const parts = out.split(/(?<=\.)\s+/);
    out = parts.map((part, i) => (/^[^:]+:\s*[^,]+,\s*\d{4}/.test(part) ? part.replace(/:\s*/, ": ").split(/:\s/).map((x) => nameCase(x)).join(": ") : i > 0 || !/^\p{Lu}+,/u.test(part) ? part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1) : part)).join(" ");
  }
  out = out.replace(/(^|;\s*)(\p{Lu}[\p{Lu}'’ -]+),\s+(\p{Lu}{2}[\p{Lu} ]*)(?=[.;])/gu, (all, lead, sur, name) => `${lead}${sur}, ${nameCase(name)}`);
  const lead = leadInfo(out);
  if (lead) {
    const segs = segments(out.slice(lead.end).trimStart());
    const off = out.length - out.slice(lead.end).trimStart().length;
    const first = segs[0];
    if (first && !SUB_ENTITY.test(first.t) && first.t === first.t.toLocaleUpperCase("pt-BR") && first.t.split(/\s+/).length >= 2 && /\p{L}{3}/u.test(first.t) && !/\*\*/.test(first.t)) {
      const low = first.t.toLocaleLowerCase("pt-BR");
      out = `${out.slice(0, off + first.s)}${low.charAt(0).toLocaleUpperCase("pt-BR")}${low.slice(1)}${out.slice(off + first.e)}`;
    }
  }
  return out;
}

// "FREIRE, Paulo (1996). Título. Local: Editora." -> "FREIRE, Paulo. Título. Local: Editora, 1996."
function fixAuthorDate(text) {
  const m = /^([\p{L}'’ -]+,\s*[\p{L}. ]+?)\.?\s*\(((?:19|20)\d{2})\)\.?\s+(.+)$/u.exec(text);
  if (!m || !/:\s+[^,.:]+\.$/.test(m[3]) || /(?:19|20)\d{2}/.test(m[3])) return text;
  return `${m[1]}. ${m[3].replace(/\.$/, `, ${m[2]}.`)}`;
}

// O negrito vai só no título. Se a referência inteira, o autor, a editora ou vários trechos estão em negrito, tira tudo e infere de novo.
function boldIsSound(text) {
  const spans = [...text.matchAll(/\*\*([^*]+)\*\*/g)];
  if (!spans.length) return true;
  if (spans.length > 1) return false;
  const m = spans[0];
  const inner = m[1];
  if (/(?<!(?:^|\s)\p{Lu})\.\s+\p{Lu}/u.test(inner) || /\.\s*$/.test(inner)) return false;
  const before = text.slice(0, m.index).trim();
  const tail = text.slice(m.index + m[0].length);
  if (!before) return false; // obra sem autor: a primeira palavra em maiúsculas já é o destaque, sem negrito
  if (segments(before).length <= 1) return true; // logo depois do autor: é o título (com subtítulo, se houver)
  const rest = tail.split(/\.\s/)[0];
  return !PLACE.test(`${inner}${rest}`);
}


// Entidade como autor ("Gartner.", "Google Cloud.", "Veracode."): vai em MAIÚSCULAS quando o resto confirma a estrutura.
const CAPWORD = /^\p{Lu}[\p{L}0-9'’&-]*$/u;
function fixEntityLead(text) {
  if (/\*\*/.test(text) || leadInfo(text)) return text;
  const segs = segments(text);
  if (segs.length < 2 || segs[0].t.includes(",") || /^In:/.test(segs[0].t)) return text;
  const words = segs[0].t.trim().split(/\s+/);
  if (words.length > 4 || !words.every((w) => CAPWORD.test(w) || /^(?:e|de|da|do|das|dos|&)$/i.test(w))) return text;
  const firstUpper = words[0].length >= 2 && words[0] === words[0].toLocaleUpperCase("pt-BR");
  if (!(firstUpper || words.length === 1)) return text;
  if (words.length === 1 && (PLACE.test(segs[1].t) || LAW.test(segs[1].t))) return text;
  return `${text.slice(0, segs[0].s)}${segs[0].t.toLocaleUpperCase("pt-BR")}${text.slice(segs[0].e)}`;
}

// Aspas no título ("Título." Jornal, data.) saem; data por extenso ("2 de fevereiro de 2025") vira "2 fev. 2025".
function fixQuotesAndDates(text) {
  let out = text.replace(/(^|\.\s+)["“]([^"”]+?)\.?["”](?=\s)/u, (all, lead, title) => `${lead}${title}.`);
  out = out.replace(/(?<!\bde\s|\d)(\d{1,2})\s+de\s+(\p{L}+)\s+de\s+((?:19|20)\d{2})/gu, (all, day, month, year) => (abntMonth(month) ? `${day} ${abntMonth(month)} ${year}` : all));
  return out;
}

// "AUTOR. Título 2025." (ano colado ao título) vira "AUTOR. Título, 2025."
function fixTitleYear(text) {
  if (/\*\*/.test(text)) return text;
  const lead = leadInfo(text);
  if (!lead) return text;
  const rest = text.slice(lead.end).trimStart();
  const segs = segments(rest);
  if (segs.length !== 1) return text;
  const m = /^(.+?[^\s,])\s+((?:19|20)\d{2})\.?$/u.exec(segs[0].t);
  if (!m || m[1].split(/\s+/).length < 2 || /Dispon|Acesso/.test(m[1]) || /(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\.?$/i.test(m[1])) return text;
  return `${text.slice(0, lead.end)} ${m[1]}. ${m[2]}.`;
}

// O que a norma exige e não dá para saber (ano, data de acesso) aparece na própria referência, no lugar certo, entre colchetes.
function addMissing(text) {
  if (!text.trim() || (!/\*\*[^*]+\*\*/.test(text) && leadInfo(text))) return text;
  const online = /\s(?=Dispon[ií]vel em:)/.exec(text);
  const head = online ? text.slice(0, online.index) : text;
  const tail = online ? text.slice(online.index) : "";
  const scan = text.replace(/https?:\/\/\S+/g, "").replace(/Acesso em:.*$/, "");
  let out = text;
  if (!/\b(?:1[5-9]\d{2}|20\d{2})\b|\[s\. ?d\.\]|\[ano\]|\bs\. ?d\./.test(scan)) { const h = head.replace(/[\s.]+$/, ""); out = `${h}${/\*\*$/.test(h) || !leadInfo(text) ? "." : ","} [ano].${tail}`; }
  if (/Dispon[ií]vel em:/.test(out) && !/Acesso em:/.test(out)) out = `${out.replace(/\s+$/, "")} Acesso em: [dia mês ano].`;
  return out;
}


// Última rede: referência sempre sai com o título em negrito. Com autor, o título é o trecho logo depois dele; sem autor, a obra
// entra pelo título (negrito e primeira palavra em maiúsculas). Só não faz nada se não houver texto de título.
function forceBold(text) {
  if (/\*\*[^*]+\*\*/.test(text)) return text;
  const lead = leadInfo(text);
  const base = lead ? lead.end : 0;
  const rest = text.slice(base);
  const offset = base + (rest.length - rest.trimStart().length);
  const segs = segments(text.slice(offset));
  const usable = segs.map((seg, i) => ({ seg, i })).filter(({ seg }) => seg.t.trim() && !/^(?:\d{4}$|\[ano\]|Dispon|Acesso|https?:)/i.test(seg.t.trim()));
  if (!usable.length) {
    // Sem título à vista: o lugar dele fica marcado, em negrito como o título deve ser.
    if (lead) { const tailText = text.slice(lead.end).trim().replace(/\.$/, ""); return `${text.slice(0, lead.end)} **[título]**${tailText ? `, ${tailText}` : ""}.`; }
    if (/Dispon[ií]vel em:|https?:\/\//i.test(text)) return `[TÍTULO]. ${text.trim()}`;
    return text;
  }
  // «gartner. Citizen Development…»: uma palavra solta seguida de outro trecho com inicial maiúscula é autor-entidade (vai em MAIÚSCULAS); o título é o trecho seguinte.
  if (!lead && usable.length >= 2) {
    const a = usable[0].seg, b = usable[1].seg;
    if (/^[\p{L}][\p{L}\d&'-]*$/u.test(a.t.trim()) && !ARTICLE.test(a.t.trim()) && /^\p{Lu}/u.test(b.t.trim())) {
      const up = `${text.slice(0, offset + a.s)}${a.t.toLocaleUpperCase("pt-BR")}${text.slice(offset + a.e)}`;
      if (up.length === text.length) return boldSpan(up, offset + b.s, offset + b.e);
    }
  }
  let pick = usable[0];
  if (lead && SUB_ENTITY.test(pick.seg.t) && usable[1]) pick = usable[1];
  const s = offset + pick.seg.s;
  const e = offset + pick.seg.e;
  if (lead) return boldSpan(text, s, e);
  const title = text.slice(s, e).trim();
  const words = title.split(/\s+/);
  const n = ARTICLE.test(words[0]) && words.length > 1 ? 2 : 1;
  const upper = [...words.slice(0, n).map((w) => w.toLocaleUpperCase("pt-BR")), ...words.slice(n)].join(" ");
  return `${text.slice(0, s)}${upper}${text.slice(e)}`; // entrada pelo título: maiúsculas, sem negrito (NBR 6023:2025)
}

// Obra sem autor: "Título. Local: Editora, ano." vira "TÍTULO. ..." (entrada pelo título: primeira palavra em maiúsculas, sem negrito, NBR 6023:2025, 6.7).
const ARTICLE = /^(?:o|a|os|as|um|uma)$/i;
function fixTitleEntry(text) {
  if (/\*\*/.test(text) || leadInfo(text)) return text;
  const segs = segments(text);
  if (segs.length < 2 || !PLACE.test(segs[1].t) || /^In:/.test(segs[0].t) || /[;]/.test(segs[0].t)) return text;
  const title = text.slice(segs[0].s, segs[0].e).trim().replace(/\.$/, "");
  if (!title || /:\s/.test(title) && false) return text;
  const words = title.split(/\s+/);
  const n = ARTICLE.test(words[0]) && words.length > 1 ? 2 : 1;
  const head = words.slice(0, n).map((w) => w.toLocaleUpperCase("pt-BR")).join(" ");
  const full = [head, ...words.slice(n)].join(" ");
  return `${text.slice(0, segs[0].s)}${full}${text.slice(segs[0].e)}`;
}

export function normalizeAbntCitation(value) {
  let text = clean(value);
  if (!text) return "";
  text = text.replace(/<(https?:\/\/[^\s<>]+)>/g, "$1").replace(/\[s\. ?d\.\]/gi, "[ano]");
  text = tidyPunctuation(text);
  if (!boldIsSound(text)) text = text.replace(/\*\*/g, "");
  text = fixCase(text);
  text = fixAuthorDate(text);
  // "Local: Editora. 2000" -> "Local: Editora, 2000." (ponto no lugar da vírgula antes do ano; ponto final)
  text = text.replace(/(?<!(?:Acesso em|Disponível em|Dispon.vel em|\*\*))(:\s+[^,.:*;]{1,60})\.\s+((?:19|20)\d{2})(?=\.?$)/u, "$1, $2").replace(/(\d{4})$/, "$1.");
  text = text.replace(/^(https?:\/\/\S+?)\.?$/, "Disponível em: $1");
  text = fixQuotesAndDates(text);
  text = fixEntityLead(text);
  text = fixAuthorLead(text);
  text = fixTitleEntry(text);
  text = fixTitleYear(text);
  text = text.replace(/(?<!\*)[*_]et al\.?[*_](?!\*)/gi, "et al.").replace(/<(?:em|i)>\s*et al\.?\s*<\/(?:em|i)>/gi, "et al.");
  text = text.replace(MANY_AUTHORS, (all, first) => `${first} et al.`).replace(/et al\.\s+et al\./g, "et al.");
  text = text.replace(/\*\*([^*:]+?):\s+([^*]+?)\*\*/g, "**$1**: $2");
  text = text.replace(/\((?:orgs?|ORGS?|Orgs?|organizador(?:es)?)\.?\)/g, "(Org.)");
  text = text.replace(/(^|[.:*]\s+)(\d{1,2})\s*[ªº.]?\s*ed(?:i[çc][ãa]o)?\.?(?=\s)/gi, "$1$2. ed.");
  text = text.replace(/(^|[.:*]\s+)1\. ed\.\s+/g, "$1");
  text = text.replace(/Dispon[ií]vel em:\s*<?(https?:\/\/[^\s<>]+?)>?\.?(?=\s|$)/gi, (all, url) => `Disponível em: ${url}.`);
  text = text.replace(/(Acesso em:\s*)0?(\d{1,2})\s*(?:de\s+)?([\p{L}]+)\.?\s*(?:de\s+)?(\d{4})/giu, (all, lead, day, month, year) => (abntMonth(month) ? `${lead}${day} ${abntMonth(month)} ${year}` : all));
  if (/\b(?:v|n|p)\.\s*\d/.test(text)) text = text.replace(/,\s*([\p{L}]+)\.?\s+(\d{4})(\.?)$/u, (all, month, year, dot) => (abntMonth(month) ? `, ${abntMonth(month)} ${year}${dot || "."}` : all));
  text = forceBold(inferBold(text));
  // lei, decreto, portaria: o destaque cobre a denominação inteira, com a data ("Lei nº 14.533, de 11 de janeiro de 2023")
  text = text.replace(/\*\*([^*]*\bn[ºo°.]\s*[\d.]+)\*\*(,\s+de\s+\d{1,2}(?:º|°)?\s+de\s+\p{L}+\s+de\s+\d{4})/gu, "**$1$2**");
  return addMissing(text);
}

// Itens do ClassAtelier são HTML (<strong> no título). Estas duas funções vão e voltam, sem perder o negrito.
export function citationFromHtml(html) {
  return clean(String(html || "").replace(/<\/?(?:strong|b)>/gi, "**").replace(/<\/?(?:em|i)>/gi, "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"));
}

export function citationToHtml(value) {
  return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

// Ordena itens em HTML pelo sobrenome/entidade (a ordem de saída da norma), sem mexer no conteúdo.
export function sortHtmlReferences(items) {
  const list = Array.isArray(items) ? items.map((item) => (typeof item === "string" ? item : String(item?.html ?? item?.citation ?? ""))) : [];
  return list.map((html, index) => ({ html, index, key: abntSortKey(citationFromHtml(html)) }))
    .sort((a, b) => (a.key && !b.key ? -1 : !a.key && b.key ? 1 : a.key.localeCompare(b.key, "pt-BR") || a.index - b.index))
    .map((entry) => entry.html);
}

// Item HTML do ClassAtelier já corrigido (negrito do título, autor, data de acesso...). Com link dentro, o texto fica como está.
// Se nada muda, devolve o próprio HTML (preserva qualquer marcação que a norma não mexe).
export function fixHtmlReference(item) {
  const html = typeof item === "string" ? item : String(item?.html ?? item?.citation ?? "");
  if (!html.trim()) return html;
  // Link no meio: o texto é corrigido com a URL à mostra e depois cada URL volta para dentro do seu <a>.
  const anchors = [];
  const withoutAnchors = html.replace(/<a\s[^>]*>([\s\S]*?)<\/a>/gi, (all, inner) => { const url = citationFromHtml(inner); anchors.push({ all, url }); return url; });
  const plainText = citationFromHtml(withoutAnchors);
  const next = normalizeAbntCitation(plainText);
  if (next === plainText) return html;
  let out = citationToHtml(next);
  anchors.forEach(({ all, url }) => { const esc = citationToHtml(url); if (esc && out.includes(esc)) out = out.replace(esc, all); });
  return out;
}

// Lista pronta para a aula: cada item corrigido e todos em ordem alfabética.
export function prepareHtmlReferences(items) {
  return sortHtmlReferences((Array.isArray(items) ? items : []).map(fixHtmlReference));
}
