import { accessRequired, hasValidAccess } from "./access.js";
import { callJson, getAIModel, getAIProvider } from "./ai-client.js";
import { normalizeStyleRules, STYLE_RULE_SIZE } from "./style-learning.js";

// "Aprender com as minhas correções": recebe as diferenças entre o texto gerado e o texto corrigido
// pelo professor (nunca a aula inteira) e devolve regras de estilo curtas, para ele aprovar.
// Só roda quando o professor pede. Não é função própria (limite de 12 no plano Hobby):
// api/regenerate-week.js despacha action "style".

const SYSTEM = `Você ajuda um professor a registrar o jeito dele de escrever. Recebe frases que uma IA escreveu e o que o professor fez com elas (reescreveu, cortou, acrescentou). Sua tarefa é descobrir PREFERÊNCIAS DE ESTILO que se repetem e escrevê-las como regras curtas para a IA seguir nas próximas aulas.

REGRAS PARA AS REGRAS
- Português do Brasil. Cada regra é UMA instrução direta, de até ${STYLE_RULE_SIZE} caracteres, no imperativo ("Evite…", "Prefira…", "Abra os parágrafos com…").
- Fale de ESTILO (tom, ritmo, vocabulário, expressões, estrutura das frases, uso de exemplos, formalidade). Nunca de assunto: nada que só valha para este curso, disciplina ou autor citado.
- Só registre o que as diferenças sustentam: o padrão aparece em dois ou mais exemplos, ou é um sinal muito claro. Na dúvida, não registre.
- Quando der, cite entre aspas curtas uma expressão a evitar ou a preferir, tirada dos exemplos.
- Não repita nem reformule as regras que o professor já tem (vêm na lista "regras atuais").
- Entre 0 e 8 regras. Se as diferenças forem só correções de fato, de digitação ou de conteúdo específico, devolva uma lista vazia.

FORMATO: somente JSON válido, sem comentários: {"rules":[{"rule":"Evite 'neste contexto' e 'é importante destacar'; vá direto ao ponto.","evidence":"Cortou essas expressões em 4 frases."}]}`;

const clip = (value, size) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, size);
const list = (items, size, limit) => (Array.isArray(items) ? items : []).map((item) => clip(item, size)).filter(Boolean).slice(0, limit);

export function buildStylePrompt({ pairs = [], cuts = [], adds = [], habits = [], existing = [] } = {}) {
  const pairLines = (Array.isArray(pairs) ? pairs : []).slice(0, 40).map((p, i) => `${i + 1}. ANTES: ${clip(p?.before, 320)}\n   DEPOIS: ${clip(p?.after, 320)}`).filter((line) => line.length > 20);
  const cutLines = list(cuts, 320, 15), addLines = list(adds, 320, 10);
  const habitLines = (Array.isArray(habits) ? habits : []).slice(0, 10).map((h) => `"${clip(h?.text ?? h, 60)}"${Number(h?.n) ? ` (tirou em ${Number(h.n)} frases)` : ""}`);
  const current = list(existing, STYLE_RULE_SIZE, 30);
  return `FRASES REESCRITAS PELO PROFESSOR:\n${pairLines.join("\n") || "(nenhuma)"}\n\nFRASES QUE ELE CORTOU:\n${cutLines.map((s) => `- ${s}`).join("\n") || "(nenhuma)"}\n\nFRASES QUE ELE ACRESCENTOU:\n${addLines.map((s) => `- ${s}`).join("\n") || "(nenhuma)"}\n\nEXPRESSÕES QUE SOMEM DAS FRASES DELE:\n${habitLines.join("; ") || "(nenhuma em comum)"}\n\nREGRAS ATUAIS (não repita):\n${current.map((s) => `- ${s}`).join("\n") || "(nenhuma)"}\n\nDevolva o JSON com as regras de estilo.`;
}

export async function learnStyle(payload = {}, ask = callJson) {
  const pairs = Array.isArray(payload.pairs) ? payload.pairs : [];
  const cuts = list(payload.cuts, 320, 15), adds = list(payload.adds, 320, 10);
  if (pairs.length + cuts.length + adds.length < 3) {
    const error = new Error("Há poucas correções para aprender (menos de 3 frases diferentes). Corrija mais um trecho no ClassAtelier e devolva a aula.");
    error.code = "STYLE_FEW"; error.status = 400;
    throw error;
  }
  const raw = await ask([
    { role: "system", content: SYSTEM },
    { role: "user", content: buildStylePrompt({ ...payload, cuts, adds }) }
  ], { temperature: 0.2, maxTokens: 1800, retryMaxTokens: 2600, label: "style", formatRetryInstruction: "Devolva novamente somente o objeto JSON com a lista rules." });
  const existing = new Set(list(payload.existing, STYLE_RULE_SIZE, 30).map((s) => s.toLowerCase()));
  const rules = normalizeStyleRules((Array.isArray(raw?.rules) ? raw.rules : []).map((item) => ({ text: item?.rule ?? item?.text, evidence: item?.evidence, source: "ia" })))
    .filter((rule) => !existing.has(rule.text.toLowerCase()))
    .slice(0, 8);
  return rules;
}

export default async function styleHandler(request, response, { ask = callJson } = {}) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") return response.status(405).json({ ok: false, error: "Método não permitido." });
  if (accessRequired() && !hasValidAccess(request)) return response.status(401).json({ ok: false, error: "Informe o código de acesso configurado para esta aplicação." });
  try {
    const rules = await learnStyle(request.body || {}, ask);
    return response.status(200).json({ ok: true, provider: "ai-style", aiProvider: getAIProvider(), model: getAIModel(), rules });
  } catch (error) {
    if (error.code !== "STYLE_FEW") console.error("style failed", error);
    const status = error.status || (error.code === "AI_KEY_MISSING" ? 503 : error.code === "AI_TPM_LIMIT" ? 429 : error.code === "AI_PROVIDER_ERROR" ? 502 : error.code === "AI_REQUEST_TOO_LARGE" ? 413 : 400);
    return response.status(status).json({ ok: false, error: error.message || "Não foi possível aprender com as correções.", code: error.code || "STYLE_ERROR", retryable: Boolean(error.retryable) });
  }
}
