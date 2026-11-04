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
  return `REFERÊNCIAS NO PADRÃO ABNT (NBR 6023:2018) — obrigatório, sem exceção:
NOMES (autor):
- pessoa física: último sobrenome em MAIÚSCULAS, vírgula e prenome(s): "Florestan Fernandes" vira FERNANDES, Florestan (Filho, Neto, Júnior e Sobrinho acompanham o sobrenome: SILVA FILHO, João);
- de 1 a 3 autores, todos, separados por ponto e vírgula e espaço ("; "): SOBRENOME, Nome; SOBRENOME, Nome; com 4 ou mais, só o primeiro seguido de et al., sem itálico;
- entidade ou instituição: nome por extenso em MAIÚSCULAS (UNIVERSIDADE FEDERAL DE SANTA CATARINA).
DESTAQUE: negrito (** **) só no título principal (da obra, do periódico ou da página), sempre do mesmo jeito; nunca no subtítulo, que vem depois de dois-pontos.
MODELOS:
- livro: AUTOR. **Título**: subtítulo. 2. ed. Local: Editora, ano. (1ª edição: omita a edição);
- capítulo: AUTOR DO CAPÍTULO. Título do capítulo. In: AUTOR DA OBRA (Org.). **Título da obra**. Local: Editora, ano. p. 10-25.
- artigo: AUTOR. Título do artigo. **Nome do periódico**, local, v. 10, n. 2, p. 15-30, mar. 2020.
- site ou documento digital: AUTOR ou ENTIDADE. **Título da página ou matéria**. ano. Disponível em: <URL>. Acesso em: ${today}.
- lei, decreto, norma ou relatório de órgão: JURISDIÇÃO ou ÓRGÃO. **Tipo e número**, de data. Ementa. Local: ano.
DATAS: mês abreviado com 3 letras e ponto (jan., fev., mar., abr., jun., jul., ago., set., out., nov., dez.), exceto maio, que se escreve por extenso.
FONTE ONLINE termina com "Disponível em: <URL>. Acesso em: ${today}." — somente quando a URL foi informada; nunca invente URL, DOI, páginas, volume ou editora: se faltar um elemento essencial, escreva a referência com o que você sabe com segurança e liste o que conferir em "Pontos a conferir".
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
export function abntIssues(reference) {
  const item = typeof reference === "string" ? { citation: reference } : reference || {};
  const raw = String(item.citation || item.title || "");
  const plainText = strip(raw);
  const issues = [];
  if (!plainText) return issues;
  if (!/^(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ'’ -]+[,.]|[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}\b)/.test(plainText)) issues.push("deve começar por SOBRENOME, Nome (ou ENTIDADE em maiúsculas)");
  if (!/\b(1[5-9]\d{2}|20\d{2})\b|\bs\.\s?d\./.test(plainText)) issues.push("falta o ano");
  if (!/\*\*[^*]+\*\*/.test(raw)) issues.push("falta o destaque (negrito) no título");
  if (/\*\*[^*:]+:\s+[^*]+\*\*/.test(raw)) issues.push("o negrito vai só no título principal, não no subtítulo");
  const leading = plainText.split(/;\s+/);
  let authors = 0;
  while (authors < leading.length && /^\p{Lu}[\p{Lu}'’ -]+,\s/u.test(leading[authors])) authors += 1;
  if (authors >= 4) issues.push("com 4 ou mais autores, use só o primeiro seguido de et al.");
  if (/(?<!\*)[*_]et al\.?[*_](?!\*)|<(?:em|i)>\s*et al/i.test(raw)) issues.push("et al. sem itálico");
  if (/\((?:orgs?|Org|ORG|organizador(?:es)?)\)|\((?:orgs?)\.\)/.test(raw)) issues.push('organizador se escreve "(Org.)"');
  if (/(?:^|[.:*]\s+)1\s*[ªº.]?\s*ed\b/i.test(plainText)) issues.push("1ª edição não se indica");
  if (/(?:^|[.:*]\s+)(?:[2-9]|\d{2})\s*[ªº]\s*ed|(?:^|[.:*]\s+)(?:[2-9]|\d{2})\s+ed\b/i.test(plainText)) issues.push('edição se escreve "2. ed."');
  const hasUrl = /https?:\/\//i.test(plainText) || /^https?:\/\//i.test(String(item.href || ""));
  if (hasUrl && !/Dispon[ií]vel em:/i.test(plainText)) issues.push('fonte online sem "Disponível em: <URL>."');
  if (/Dispon[ií]vel em:\s*https?:/i.test(plainText)) issues.push("a URL vai entre < >");
  if (/Dispon[ií]vel em:/i.test(plainText) && !/Acesso em:/i.test(plainText)) issues.push('falta "Acesso em: data."');
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
  return url ? `Disponível em: <${url}>. Acesso em: ${accessDate(entry.acesso, today)}.` : "";
}

function placeAndYear(entry) {
  const local = clean(entry.local) || "[S. l.]";
  const editora = clean(entry.editora) || "[s. n.]";
  const ano = clean(entry.ano) || "[s. d.]";
  return `${local}: ${editora}, ${ano}.`;
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
    const when = [month, clean(entry.ano)].filter(Boolean).join(" ") || "[s. d.]";
    out = `${lead(authors)}${withPeriod(clean(entry.titulo))} **${clean(entry.revista)}**, ${issue.concat(when).join(", ")}.`;
  } else if (type === "site") {
    out = `${lead(authors)}${withPeriod(titleBlock(entry))} ${clean(entry.ano) ? `${withPeriod(clean(entry.ano))} ` : ""}`;
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
  const journal = segs.findIndex((seg, i) => i >= 1 && /^[^,*]+,.*(?:^|[\s,])(?:v|n|p)\.\s*\d/.test(seg.t));
  if (journal >= 1) { const s0 = offset + segs[journal].s; return boldSpan(text, s0, s0 + segs[journal].t.indexOf(",")); }
  const law = LAW.exec(at(0));
  if (law) { const s0 = offset + segs[0].s; return `${text.slice(0, s0)}**${law[1]}**${text.slice(s0 + law[1].length)}`; }
  if (PLACE.test(at(1)) || (segs.length === 2 && PLACE_NO_YEAR.test(at(1)))) return bold(0);
  if (SUB_ENTITY.test(at(0)) && PLACE.test(at(2))) return bold(1);
  if (!PLACE.test(at(1)) && /^(?:\d{4}|\[s\. ?d\.\]|Dispon)/i.test(at(1))) return bold(0);
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

export function normalizeAbntCitation(value) {
  let text = clean(value);
  if (!text) return "";
  text = fixAuthorLead(text);
  text = text.replace(/(?<!\*)[*_]et al\.?[*_](?!\*)/gi, "et al.").replace(/<(?:em|i)>\s*et al\.?\s*<\/(?:em|i)>/gi, "et al.");
  text = text.replace(MANY_AUTHORS, (all, first) => `${first} et al.`).replace(/et al\.\s+et al\./g, "et al.");
  text = text.replace(/\*\*([^*:]+?):\s+([^*]+?)\*\*/g, "**$1**: $2");
  text = text.replace(/\((?:orgs?|ORGS?|Orgs?|organizador(?:es)?)\.?\)/g, "(Org.)");
  text = text.replace(/(^|[.:*]\s+)(\d{1,2})\s*[ªº.]?\s*ed(?:i[çc][ãa]o)?\.?(?=\s)/gi, "$1$2. ed.");
  text = text.replace(/(^|[.:*]\s+)1\. ed\.\s+/g, "$1");
  text = text.replace(/Dispon[ií]vel em:\s*(https?:\/\/[^\s<>]+?)\.?(?=\s|$)/gi, (all, url) => `Disponível em: <${url}>.`);
  text = text.replace(/(Acesso em:\s*)0?(\d{1,2})\s*(?:de\s+)?([\p{L}]+)\.?\s*(?:de\s+)?(\d{4})/giu, (all, lead, day, month, year) => (abntMonth(month) ? `${lead}${day} ${abntMonth(month)} ${year}` : all));
  if (/\b(?:v|n|p)\.\s*\d/.test(text)) text = text.replace(/,\s*([\p{L}]+)\.?\s+(\d{4})(\.?)$/u, (all, month, year, dot) => (abntMonth(month) ? `, ${abntMonth(month)} ${year}${dot || "."}` : all));
  return inferBold(text);
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
  if (!html.trim() || /<a[\s>]/i.test(html)) return html;
  const plainText = citationFromHtml(html);
  const next = normalizeAbntCitation(plainText);
  return next === plainText ? html : citationToHtml(next);
}

// Lista pronta para a aula: cada item corrigido e todos em ordem alfabética.
export function prepareHtmlReferences(items) {
  return sortHtmlReferences((Array.isArray(items) ? items : []).map(fixHtmlReference));
}
