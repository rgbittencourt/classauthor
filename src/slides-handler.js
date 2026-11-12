import { accessRequired, hasValidAccess } from "./access.js";
import { applyCors } from "./figure-handler.js";
import { getAIModel, getAIProvider } from "./ai-client.js";
import { slideAnswer, slidesForSection, slidesFrame, slidesOutline } from "./slides.js";

// Slides pedidos pelo ClassAtelier (outro endereço, por isso CORS, como em /api/figure).
// Não é uma função própria (limite de 12 no plano Hobby): api/regenerate-week.js a despacha
// com action "slides". mode "frame" devolve pergunta, objetivos e síntese; mode "section",
// os slides de uma seção (count = quantidade exata); mode "answer", a resposta detalhada de uma pergunta; mode "outline", o plano do deck inteiro. O ClassAtelier faz uma chamada por seção, em paralelo.
export default async function slidesHandler(request, response, deps = {}) {
  response.setHeader("Cache-Control", "no-store");
  const known = applyCors(request, response);
  if (request.method === "OPTIONS") return response.status(known ? 204 : 403).end();
  if (request.headers?.origin && !known) return response.status(403).json({ ok: false, error: "Este endereço não tem permissão para pedir slides ao ClassAuthor.", code: "SLIDES_ORIGIN" });
  if (request.method !== "POST") return response.status(405).json({ ok: false, error: "Método não permitido." });
  if (accessRequired() && !hasValidAccess(request)) return response.status(401).json({ ok: false, error: "Código de acesso do ClassAuthor ausente ou incorreto.", code: "SLIDES_ACCESS" });
  try {
    const body = request.body || {};
    const result = body.mode === "frame" ? await slidesFrame(body, deps) : body.mode === "answer" ? await slideAnswer(body, deps) : body.mode === "outline" ? await slidesOutline(body, deps) : await slidesForSection(body, deps);
    return response.status(200).json({ ok: true, aiProvider: getAIProvider(), model: getAIModel(), ...result });
  } catch (error) {
    const status = error.code === "AI_KEY_MISSING" ? 503 : error.code === "AI_TPM_LIMIT" ? 429 : error.code === "AI_PROVIDER_ERROR" ? 502 : error.code === "SLIDES_INVALID" ? 502 : 400;
    return response.status(status).json({ ok: false, error: error.message || "Não foi possível gerar os slides.", code: error.code || "SLIDES_ERROR", retryable: Boolean(error.retryable) });
  }
}
