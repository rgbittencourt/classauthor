// Rubrica de avaliação de uma atividade ou prática: gerada só quando o professor pede.
// Não é uma função serverless própria (limite de 12 no plano Hobby da Vercel):
// api/regenerate-week.js a despacha com action "rubric".
//   body: { input, weekIndex, week, item: { kind, id, title, type, instructions, evidence, criteria, objective, product, assessment }, instruction? }

import { accessRequired, hasValidAccess } from "./access.js";
import { normalizeCourseInput } from "./aula-schema.js";
import { callJson, getAIModel, getAIProvider } from "./ai-client.js";
import { RUBRIC_LEVELS, RUBRIC_MAX_SCORE, normalizeRubricData } from "./rubric-core.js";

const clip = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const list = (value) => (Array.isArray(value) ? value : []);

const SYSTEM = `Você é especialista em avaliação educacional do IFSC (Instituto Federal de Santa Catarina), com experiência em cursos de pós-graduação a distância (TEDPRO e TGE) e na educação profissional e tecnológica. Sua tarefa é LER a atividade e propor uma rubrica de avaliação alinhada exatamente ao que foi pedido aos estudantes. Responda em português do Brasil, apenas com JSON válido.

Princípios:
- Os critérios devem derivar das entregas, etapas, formulários e requisitos que aparecem nas instruções. Não invente exigências que não estão lá.
- Se houver formulário ou modelo a ser preenchido, avalie o preenchimento das partes relevantes.
- Se as instruções já trazem critérios ou pontuações, respeite-os.
- Descritores claros, observáveis, no estilo acadêmico brasileiro, humanizados (não robóticos), em linguagem de avaliação formativa: o que o estudante fez ou deixou de fazer, nunca traços de personalidade.
- Não invente fatos, normas ou referências.
- Nas descrições, não use aspas duplas, ponto e vírgula nem os sinais < e >.`;

export function buildRubricPrompt(input, index, week, item, { instruction = "", criteriaCount = 0, maxScore = RUBRIC_MAX_SCORE, statement = "" } = {}) {
  const count = Math.min(6, Math.max(2, Number(criteriaCount) || 0)) || 0;
  const max = Number(maxScore) > 0 ? Number(maxScore) : RUBRIC_MAX_SCORE;
  const plan = week?.lessonPlan || {};
  const objectives = list(plan.learningObjectives).map((objective) => clip(objective, 220)).slice(0, 6);
  const existing = list(item.criteria).map((criterion) => clip(typeof criterion === "string" ? criterion : criterion?.criterion || criterion?.title, 200)).filter(Boolean).slice(0, 8);
  const levels = RUBRIC_LEVELS.map((level) => `${level.key} = ${level.label} (${level.pct}% da pontuação)`).join("; ");
  return `Curso: "${clip(input.title, 160)}" (${clip(input.level, 60)}; público: ${clip(input.audience, 160)}).
Aula ${index + 1} de ${input.weeks}: ${clip(plan.theme || week?.meta?.title, 200)}.
Objetivos de aprendizagem da aula: ${objectives.join("; ") || "(não informados)"}.

INSTRUMENTO A AVALIAR (${clip(item.kind === "practice" ? "prática / laboratório" : item.type || "atividade", 60)}): ${clip(item.title, 200)}
Orientações ao estudante: ${clip(item.instructions, 1200) || "(não informadas)"}
Objetivo: ${clip(item.objective, 400) || "(não informado)"}
Produto ou evidência esperada: ${clip(item.evidence || item.product, 500) || "(não informada)"}
Como já está previsto avaliar: ${clip(item.assessment, 500) || "(não informado)"}
${existing.length ? `Critérios já previstos (use-os como base, sem perder nenhum): ${existing.join("; ")}.` : ""}
${clip(statement, 6000) ? `ENUNCIADO EXATO DA ATIVIDADE, como foi passado aos estudantes (a rubrica deve avaliar o que ele pede, nada além):\n<<<\n${String(statement).trim().slice(0, 6000)}\n>>>` : ""}
${instruction ? `PEDIDO DO PROFESSOR: "${clip(instruction, 1200)}". Atenda ao pedido.` : ""}

Monte uma rubrica analítica com ${count ? `exatamente ${count} critérios` : "3 a 5 critérios"}. Cada critério tem um peso inteiro (a soma dos pesos é 100) e uma descrição para cada nível: ${levels}. As descrições devem ser concretas, graduais (cada nível claramente diferente do vizinho), curtas (até 220 caracteres) e alinhadas aos objetivos. A nota máxima é ${max}. O último nível (insuficiente) vale 0 ponto e descreve o que se vê quando o critério não foi atendido ou não foi realizado.

Devolva este JSON:
{
  "analysis": "resumo em 2 a 4 frases do que a atividade pede (entregas, formato, formulários), para o professor conferir se a leitura foi correta",
  "criteria": [
    { "name": "nome curto do critério", "weight": 30, "levels": { "excellent": "…", "good": "…", "fair": "…", "insufficient": "…" } }
  ],
  "notes": "orientação curta (até 300 caracteres) para quem vai avaliar: como usar a rubrica e o que observar no feedback"
}`;
}

export async function generateRubric(input, index, week, item, options = {}) {
  const raw = await callJson([
    { role: "system", content: SYSTEM },
    { role: "user", content: buildRubricPrompt(input, index, week, item, options) }
  ], { temperature: 0.3, maxTokens: 4000, retryMaxTokens: 6000, label: "rubric", formatRetryInstruction: "Devolva novamente somente o objeto JSON da rubrica, completo e válido." });
  const rubric = normalizeRubricData({ ...raw, maxScore: Number(options.maxScore) > 0 ? Number(options.maxScore) : RUBRIC_MAX_SCORE }, { title: clip(item.title, 120) || "Rubrica", weekIndex: index, source: { kind: item.kind === "practice" ? "practice" : "activity", id: clip(item.id, 80), title: clip(item.title, 160) } });
  if (rubric.criteria.length < 2) {
    const error = new Error("A IA não devolveu critérios suficientes para a rubrica. Tente de novo.");
    error.code = "RUBRIC_EMPTY"; error.retryable = true;
    throw error;
  }
  return rubric;
}

export default async function rubricHandler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") return response.status(405).json({ ok: false, error: "Método não permitido." });
  if (accessRequired() && !hasValidAccess(request)) return response.status(401).json({ ok: false, error: "Informe o código de acesso configurado para esta aplicação." });
  try {
    const input = normalizeCourseInput(request.body?.input || {});
    const index = Math.max(0, Math.min(input.weeks - 1, Number.parseInt(request.body?.weekIndex, 10) || 0));
    const item = request.body?.item && typeof request.body.item === "object" ? request.body.item : {};
    if (!clip(item.title, 200)) return response.status(400).json({ ok: false, error: "Escolha a atividade ou prática que receberá a rubrica.", code: "RUBRIC_NO_ITEM" });
    const rubric = await generateRubric(input, index, request.body?.week, item, { instruction: request.body?.instruction, criteriaCount: request.body?.criteriaCount, maxScore: request.body?.maxScore, statement: request.body?.statement });
    return response.status(200).json({ ok: true, provider: "ai-rubric", aiProvider: getAIProvider(), model: getAIModel(), weekIndex: index, rubric });
  } catch (error) {
    console.error("rubric failed", error);
    const status = error.code === "AI_KEY_MISSING" ? 503 : error.code === "AI_TPM_LIMIT" ? 429 : error.code === "AI_PROVIDER_ERROR" ? 502 : error.code === "AI_REQUEST_TOO_LARGE" ? 413 : 400;
    return response.status(status).json({ ok: false, error: error.message || "Não foi possível gerar a rubrica.", code: error.code || "RUBRIC_ERROR", retryable: Boolean(error.retryable) });
  }
}
