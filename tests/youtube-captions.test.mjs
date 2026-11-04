import test from "node:test";
import assert from "node:assert/strict";
import { extractVideoId, decodeEntities, parseCaptionXml, cuesToParagraphs, pickTrack, fetchYouTubeTranscript } from "../src/youtube-captions.js";
import captionsHandler from "../src/captions-handler.js";

const XML3 = `<?xml version="1.0"?><timedtext format="3"><body><p t="0" d="2000">Ol&amp;#39;a, turma!</p><p t="2000" d="2500">Hoje vamos <s>falar</s> de <s>acessibilidade.</s></p><p t="9000" d="1500">Depois da pausa.</p></body></timedtext>`;
const XML1 = `<transcript><text start="0" dur="2.5">Primeira &quot;fala&quot;.</text><text start="2.5" dur="1">Segunda.</text></transcript>`;
const tracks = [
  { baseUrl: "https://www.youtube.com/api/timedtext?v=abc&lang=en&fmt=srv3", languageCode: "en", name: { simpleText: "English" } },
  { baseUrl: "https://www.youtube.com/api/timedtext?v=abc&lang=pt&kind=asr", languageCode: "pt", kind: "asr", name: { simpleText: "Português (gerado automaticamente)" } },
  { baseUrl: "https://www.youtube.com/api/timedtext?v=abc&lang=pt-BR", languageCode: "pt-BR", name: { simpleText: "Português (Brasil)" } }
];

test("extractVideoId aceita ID e endereços", () => {
  assert.equal(extractVideoId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5"), "dQw4w9WgXcQ");
  assert.equal(extractVideoId("https://youtu.be/dQw4w9WgXcQ?t=3"), "dQw4w9WgXcQ");
  assert.equal(extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractVideoId("lixo"), "");
});

test("decodeEntities resolve dupla codificação", () => {
  assert.equal(decodeEntities("Ol&amp;#39;a &lt;b&gt; &#233;"), "Ol'a <b> é");
});

test("parseCaptionXml lê os dois formatos", () => {
  const a = parseCaptionXml(XML3);
  assert.equal(a.length, 3);
  assert.equal(a[0].text, "Ol'a, turma!");
  assert.equal(a[1].text, "Hoje vamos falar de acessibilidade.");
  assert.equal(a[2].start, 9);
  const b = parseCaptionXml(XML1);
  assert.deepEqual(b.map((c) => c.text), ['Primeira "fala".', "Segunda."]);
});

test("cuesToParagraphs quebra em pausas longas", () => {
  const paragraphs = cuesToParagraphs(parseCaptionXml(XML3));
  assert.equal(paragraphs.length, 2);
  assert.match(paragraphs[0], /acessibilidade\.$/);
  assert.equal(paragraphs[1], "Depois da pausa.");
});

test("cuesToParagraphs quebra textos longos em fim de frase", () => {
  const cues = Array.from({ length: 40 }, (_, i) => ({ start: i * 3, end: i * 3 + 2.9, text: i % 5 === 4 ? "Frase completa número " + i + "." : "trecho sem ponto " + i }));
  const paragraphs = cuesToParagraphs(cues);
  assert.ok(paragraphs.length > 1);
  assert.ok(paragraphs.every((p) => p.length < 900));
});

test("pickTrack prefere legenda humana no idioma, depois automática, depois inglês", () => {
  assert.equal(pickTrack(tracks, "pt").languageCode, "pt-BR");
  assert.equal(pickTrack(tracks.slice(0, 2), "pt").kind, "asr");
  assert.equal(pickTrack([tracks[0]], "pt").languageCode, "en");
  assert.equal(pickTrack([], "pt"), null);
});

const fakeFetch = (captionTracks, { xml = XML3, playability = { status: "OK" }, captionOk = true } = {}) => async (url) => {
  if (String(url).includes("youtubei/v1/player")) return { ok: true, status: 200, json: async () => ({ playabilityStatus: playability, captions: captionTracks ? { playerCaptionsTracklistRenderer: { captionTracks } } : undefined }) };
  return { ok: captionOk, status: captionOk ? 200 : 403, text: async () => xml };
};

test("fetchYouTubeTranscript monta o texto e informa se é automática", async () => {
  const human = await fetchYouTubeTranscript("dQw4w9WgXcQ", { fetchImpl: fakeFetch(tracks) });
  assert.equal(human.auto, false);
  assert.equal(human.language, "pt-BR");
  assert.equal(human.paragraphs, 2);
  assert.match(human.text, /\n\n/);
  const auto = await fetchYouTubeTranscript("dQw4w9WgXcQ", { fetchImpl: fakeFetch([tracks[1]]) });
  assert.equal(auto.auto, true);
});

test("fetchYouTubeTranscript explica cada falha", async () => {
  await assert.rejects(() => fetchYouTubeTranscript("x", { fetchImpl: fakeFetch(tracks) }), { code: "CAPTIONS_ID" });
  await assert.rejects(() => fetchYouTubeTranscript("dQw4w9WgXcQ", { fetchImpl: fakeFetch(undefined) }), { code: "CAPTIONS_NONE" });
  await assert.rejects(() => fetchYouTubeTranscript("dQw4w9WgXcQ", { fetchImpl: fakeFetch(tracks, { playability: { status: "LOGIN_REQUIRED", reason: "Sign in to confirm you're not a bot" } }) }), { code: "CAPTIONS_UNAVAILABLE" });
  await assert.rejects(() => fetchYouTubeTranscript("dQw4w9WgXcQ", { fetchImpl: fakeFetch(tracks, { captionOk: false }) }), { code: "CAPTIONS_BLOCKED" });
  await assert.rejects(() => fetchYouTubeTranscript("dQw4w9WgXcQ", { fetchImpl: async () => { throw new Error("rede"); } }), { code: "CAPTIONS_NETWORK" });
  await assert.rejects(() => fetchYouTubeTranscript("dQw4w9WgXcQ", { fetchImpl: fakeFetch([{ ...tracks[0], baseUrl: "https://evil.example/x" }]) }), { code: "CAPTIONS_BLOCKED" });
});

function mock(method, headers, body) {
  const out = { headers: {}, status: 0, body: null };
  const response = { setHeader: (k, v) => { out.headers[k] = v; }, status(code) { out.status = code; return this; }, json(data) { out.body = data; return this; }, end() { return this; } };
  return { request: { method, headers, body }, response, out };
}

test("handler: CORS, código de acesso e resposta", async () => {
  const prev = process.env.AULA_ACCESS_CODE;
  process.env.AULA_ACCESS_CODE = "segredo";
  try {
    const stub = async () => ({ videoId: "dQw4w9WgXcQ", text: "Oi", paragraphs: 1, characters: 2, language: "pt", languageName: "Português", auto: false, tracks: [] });
    let m = mock("OPTIONS", { origin: "https://rgbittencourt.github.io" }, {});
    await captionsHandler(m.request, m.response);
    assert.equal(m.out.status, 204);
    assert.equal(m.out.headers["Access-Control-Allow-Origin"], "https://rgbittencourt.github.io");
    m = mock("POST", { origin: "https://rgbittencourt.github.io" }, { video: "dQw4w9WgXcQ" });
    await captionsHandler(m.request, m.response, { fetchTranscript: stub });
    assert.equal(m.out.status, 401);
    m = mock("POST", { origin: "https://rgbittencourt.github.io", "x-aula-access-code": "segredo" }, { video: "dQw4w9WgXcQ" });
    await captionsHandler(m.request, m.response, { fetchTranscript: stub });
    assert.equal(m.out.status, 200);
    assert.equal(m.out.body.text, "Oi");
    m = mock("POST", { origin: "https://outro.site", "x-aula-access-code": "segredo" }, { video: "dQw4w9WgXcQ" });
    await captionsHandler(m.request, m.response, { fetchTranscript: stub });
    assert.equal(m.out.status, 403);
    m = mock("POST", { origin: "https://rgbittencourt.github.io", "x-aula-access-code": "segredo" }, { video: "x" });
    await captionsHandler(m.request, m.response);
    assert.equal(m.out.status, 400);
    assert.equal(m.out.body.code, "CAPTIONS_ID");
  } finally { if (prev === undefined) delete process.env.AULA_ACCESS_CODE; else process.env.AULA_ACCESS_CODE = prev; }
});

test("fetchYouTubeTranscript tenta outro cliente do YouTube quando o primeiro é bloqueado", async () => {
  const clients = [];
  const fetchImpl = async (url, options = {}) => {
    if (String(url).includes("youtubei/v1/player")) {
      const name = JSON.parse(options.body).context.client.clientName;
      clients.push(name);
      if (name === "ANDROID") return { ok: true, status: 200, json: async () => ({ playabilityStatus: { status: "LOGIN_REQUIRED", reason: "Sign in to confirm you're not a bot" } }) };
      return { ok: true, status: 200, json: async () => ({ playabilityStatus: { status: "OK" }, captions: { playerCaptionsTracklistRenderer: { captionTracks: tracks } } }) };
    }
    return { ok: true, status: 200, text: async () => XML3 };
  };
  const result = await fetchYouTubeTranscript("dQw4w9WgXcQ", { fetchImpl });
  assert.deepEqual(clients, ["ANDROID", "IOS"]);
  assert.ok(result.text.length > 0);
});

test("fetchYouTubeTranscript não insiste quando o vídeo é privado ou removido", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return { ok: true, status: 200, json: async () => ({ playabilityStatus: { status: "ERROR", reason: "Video unavailable" } }) }; };
  await assert.rejects(() => fetchYouTubeTranscript("dQw4w9WgXcQ", { fetchImpl }), { code: "CAPTIONS_UNAVAILABLE", status: 404 });
  assert.equal(calls, 1);
});
