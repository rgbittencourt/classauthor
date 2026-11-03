import { accessRequired, hasValidAccess } from "./access.js";
import { applyCors } from "./figure-handler.js";
import { CaptionsError, fetchYouTubeTranscript } from "./youtube-captions.js";

// Legendas do YouTube para o ClassAtelier (editor em outro endereço, por isso CORS).
// Não é função própria (limite de 12 no plano Hobby): api/regenerate-week.js despacha action "captions".
// Exige o código de acesso, para o serviço não virar um buscador aberto de legendas.
export default async function captionsHandler(request, response, { fetchTranscript = fetchYouTubeTranscript } = {}) {
  response.setHeader("Cache-Control", "no-store");
  const known = applyCors(request, response);
  if (request.method === "OPTIONS") return response.status(known ? 204 : 403).end();
  if (request.headers?.origin && !known) return response.status(403).json({ ok: false, error: "Este endereço não tem permissão para pedir legendas ao ClassAuthor.", code: "CAPTIONS_ORIGIN" });
  if (request.method !== "POST") return response.status(405).json({ ok: false, error: "Método não permitido." });
  if (accessRequired() && !hasValidAccess(request)) return response.status(401).json({ ok: false, error: "Código de acesso do ClassAuthor ausente ou incorreto.", code: "CAPTIONS_ACCESS" });
  try {
    const body = request.body || {};
    const result = await fetchTranscript(body.video || body.id || body.url, { language: String(body.language || "pt").slice(0, 8) });
    return response.status(200).json({ ok: true, ...result });
  } catch (error) {
    const known = error instanceof CaptionsError;
    return response.status(known ? error.status : 500).json({ ok: false, error: known ? error.message : "Não foi possível buscar as legendas.", code: known ? error.code : "CAPTIONS_ERROR" });
  }
}
