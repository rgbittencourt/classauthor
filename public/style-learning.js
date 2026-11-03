// Aprender o estilo do professor a partir das correções que ele faz no texto.
//
// O ClassAuthor escreve a semana; o professor corrige no ClassAtelier e devolve. Este módulo compara
// o texto gerado com o texto devolvido, frase a frase, e separa três coisas: frases REESCRITAS (antes →
// depois), frases CORTADAS e frases ACRESCENTADAS. Também conta as expressões que ele costuma tirar.
// Nada aqui usa IA nem rede: a IA só entra quando o professor pede "aprender" (src/style-handler.js),
// e recebe apenas as diferenças, não a aula inteira.
//
// Código puro (sem Node): public/style-learning.js é cópia idêntica deste arquivo e roda no navegador.

const SKIP = new Set(["id", "type", "src", "url", "href", "link", "slotId", "tone", "icon", "bg", "pad", "level", "variant", "style", "color", "align", "ratio", "width", "height", "columns", "layout", "gap", "emphasis", "dropcap", "dropcapTone", "loop", "editSlide", "defaultOpen", "avaliativo", "passMark", "embed", "spotify", "start", "duration", "responsive", "useEmbedDimensions", "showAttribution", "triggerLabel", "answer", "correct", "correctIndex", "credit", "alt"]);
const looksTechnical = (text) => /^(https?:|data:|blob:|#[0-9a-f]{3,8}$|\.{0,2}\/|[\w-]+\.(png|jpe?g|gif|svg|webp|mp3|mp4)$)/i.test(text.trim());

const plainText = (html) => String(html ?? "")
  .replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
  .replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

function collect(value, out, depth) {
  if (depth > 7 || value == null) return;
  if (typeof value === "string") {
    if (/[A-Za-zÀ-ÿ]/.test(value) && !looksTechnical(value)) { const text = plainText(value); if (text) out.push(text); }
    return;
  }
  if (Array.isArray(value)) { value.forEach((item) => collect(item, out, depth + 1)); return; }
  if (typeof value === "object") Object.keys(value).forEach((key) => { if (!SKIP.has(key)) collect(value[key], out, depth + 1); });
}

// Texto corrido de uma lista de blocos do ClassAtelier (a mesma regra para o original e o corrigido).
export function blocksText(blocks) {
  const out = [];
  collect(blocks, out, 0);
  return out.join("\n");
}

const clip = (text, size) => (text.length > size ? text.slice(0, size - 1).trimEnd() + "…" : text);
const words = (text) => (String(text).match(/[\p{L}\p{N}'’-]+/gu) || []);
const keyOf = (text) => words(text).join(" ").toLowerCase();

// Frases com pelo menos 4 palavras (títulos curtos e rótulos não dizem nada sobre o estilo).
export function splitSentences(text) {
  const out = [];
  String(text || "").split(/\n+/).forEach((paragraph) => {
    paragraph.split(/(?<=[.!?…])["”')\]]*\s+(?=[A-ZÀ-Ú“"(\d])/u).forEach((part) => {
      const sentence = part.replace(/\s+/g, " ").trim();
      if (words(sentence).length >= 4) out.push(sentence);
    });
  });
  return out;
}

function similarity(a, b) {
  const x = new Set(words(a).map((w) => w.toLowerCase())), y = new Set(words(b).map((w) => w.toLowerCase()));
  if (!x.size || !y.size) return 0;
  let shared = 0;
  x.forEach((w) => { if (y.has(w)) shared += 1; });
  return shared / (x.size + y.size - shared);
}

// Compara o texto gerado com o corrigido. Devolve pares antes → depois, cortes e acréscimos.
export function diffSentences(beforeText, afterText, { maxPairs = 40, maxCuts = 15, maxAdds = 10, clipAt = 320 } = {}) {
  const before = splitSentences(beforeText), after = splitSentences(afterText);
  const afterKeys = new Set(after.map(keyOf)), beforeKeys = new Set(before.map(keyOf));
  const removed = before.filter((s) => !afterKeys.has(keyOf(s)));
  const added = after.filter((s) => !beforeKeys.has(keyOf(s)));
  // Emparelha cada frase removida com a acrescentada mais parecida (a mesma ideia, com outras palavras).
  const candidates = [];
  removed.forEach((r, ri) => added.forEach((a, ai) => { const score = similarity(r, a); if (score >= 0.34) candidates.push({ ri, ai, score }); }));
  candidates.sort((p, q) => q.score - p.score);
  const usedR = new Set(), usedA = new Set(), pairs = [];
  candidates.forEach(({ ri, ai, score }) => {
    if (usedR.has(ri) || usedA.has(ai)) return;
    usedR.add(ri); usedA.add(ai);
    pairs.push({ before: removed[ri], after: added[ai], change: Math.round((1 - score) * 100) / 100 });
  });
  // As mudanças maiores dizem mais sobre o gosto do professor do que um ajuste de vírgula.
  pairs.sort((p, q) => q.change - p.change);
  const cuts = removed.filter((_, i) => !usedR.has(i)), adds = added.filter((_, i) => !usedA.has(i));
  const wordsBefore = words(beforeText).length, wordsAfter = words(afterText).length;
  return {
    pairs: pairs.slice(0, maxPairs).map((p) => ({ before: clip(p.before, clipAt), after: clip(p.after, clipAt) })),
    cuts: cuts.slice(0, maxCuts).map((s) => clip(s, clipAt)),
    adds: adds.slice(0, maxAdds).map((s) => clip(s, clipAt)),
    counts: { sentences: before.length, rewritten: pairs.length, cut: cuts.length, added: adds.length, wordsBefore, wordsAfter },
    changed: pairs.length + cuts.length + adds.length
  };
}

const STOP = new Set("a o as os um uma uns umas de do da dos das em no na nos nas por para com sem e ou que se ao aos à às é são foi ser há mais como mas já não sua seu suas seus isso este esta esse essa nós você vocês".split(" "));

// Expressões de 2 a 4 palavras que aparecem nas frases ANTES e somem nas frases DEPOIS, em pelo menos
// `min` pares: o "tique" que o professor costuma tirar.
export function habitsFrom(pairs, { min = 2, limit = 10 } = {}) {
  const counts = new Map();
  (pairs || []).forEach(({ before, after }) => {
    const b = words(before).map((w) => w.toLowerCase()), a = ` ${words(after).join(" ").toLowerCase()} `;
    const seen = new Set();
    for (let size = 2; size <= 4; size += 1) {
      for (let i = 0; i + size <= b.length; i += 1) {
        const gram = b.slice(i, i + size);
        if (STOP.has(gram[0]) && STOP.has(gram[gram.length - 1])) continue;
        if (gram.every((w) => STOP.has(w))) continue;
        const text = gram.join(" ");
        if (a.includes(` ${text} `) || seen.has(text)) continue;
        seen.add(text); counts.set(text, (counts.get(text) || 0) + 1);
      }
    }
  });
  const ranked = [...counts.entries()].filter(([, n]) => n >= min).sort((p, q) => q[1] - p[1] || q[0].length - p[0].length);
  // Entre "neste contexto" e "neste contexto de", fica a mais longa que se repete tanto quanto.
  // Variações da mesma expressão ("neste contexto é", "contexto é importante") entram uma vez só: se dividem
  // uma palavra de conteúdo com uma expressão que já foi escolhida e se repete ao menos tanto, ficam de fora.
  const content = (text) => text.split(" ").filter((w) => !STOP.has(w));
  const kept = [];
  ranked.forEach(([text, n]) => {
    const mine = content(text);
    if (!kept.some((k) => k.n >= n && (k.text.includes(text) || k.words.some((w) => mine.includes(w))))) kept.push({ text, n, words: content(text) });
  });
  return kept.slice(0, limit).map(({ text, n }) => ({ text, n }));
}

// ── Regras de estilo guardadas ──
export const STYLE_RULE_LIMIT = 30;
export const STYLE_RULE_SIZE = 260;

export function normalizeStyleRules(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((item) => {
    const raw = typeof item === "string" ? { text: item } : item && typeof item === "object" ? item : {};
    const text = String(raw.text ?? raw.rule ?? "").replace(/\s+/g, " ").trim().slice(0, STYLE_RULE_SIZE);
    const key = keyOf(text);
    if (text.length < 8 || seen.has(key)) return;
    seen.add(key);
    out.push({ id: String(raw.id || `r${out.length + 1}${Math.random().toString(36).slice(2, 6)}`), text, on: raw.on !== false, source: raw.source === "manual" ? "manual" : "ia", evidence: String(raw.evidence || "").slice(0, 300), at: String(raw.at || "") });
  });
  return out.slice(0, STYLE_RULE_LIMIT);
}

// Só as regras ligadas, como texto simples (é o que vai para o pedido à IA).
export function activeStyleGuide(rules) {
  return normalizeStyleRules(rules).filter((rule) => rule.on).map((rule) => rule.text);
}

// Bloco do pedido de redação.
export function styleGuideBlock(guide) {
  const items = (Array.isArray(guide) ? guide : []).map((item) => String(item || "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, STYLE_RULE_LIMIT);
  if (!items.length) return "";
  return `ESTILO DO PROFESSOR (aprendido das correções que ele fez em textos anteriores; siga em todo o texto, sem citar estas regras):\n${items.map((item) => `- ${item}`).join("\n")}`;
}
