import test from "node:test";
import assert from "node:assert/strict";
import { hasValidAccess, hasServerAccess, withKeyContext } from "../src/access.js";
import { readUserKeys, youtubeKeyForRequest, inferProvider } from "../src/user-keys.js";
import { getAIProvider, getAIModel, isAIConfigured, callJson } from "../src/ai-client.js";
import { testKeys } from "../src/keys-handler.js";

const ANT = "sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const OAI = "sk-proj-abcdefghijklmnopqrstuvwxyz0123456789";
const YT = "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ0123456";
const req = (headers = {}) => ({ headers });

function withEnv(env, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(env)) { saved[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  const restore = () => { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } };
  return Promise.resolve().then(fn).finally(restore);
}

test("acesso: código certo ou chave de IA própria passam; sem nada, não", async () => {
  await withEnv({ AULA_ACCESS_CODE: "segredo" }, () => {
    assert.equal(hasValidAccess(req({ "x-aula-access-code": "segredo" })), true);
    assert.equal(hasValidAccess(req({ "x-aula-access-code": "errado" })), false);
    assert.equal(hasValidAccess(req()), false);
    assert.equal(hasValidAccess(req({ "x-aula-ai-key": ANT })), true);
    assert.equal(hasServerAccess(req({ "x-aula-ai-key": ANT })), false);
    // chave mal formada (injeção de cabeçalho, curta demais) não vale como acesso
    assert.equal(hasValidAccess(req({ "x-aula-ai-key": "curta" })), false);
    assert.equal(hasValidAccess(req({ "x-aula-ai-key": "sk-ant-aaaaaaaaaaaaaaaaaaaa\r\nX: y" })), false);
    // só a chave do YouTube não basta
    assert.equal(hasValidAccess(req({ "x-aula-youtube-key": YT })), false);
  });
});

test("provedor é deduzido pela chave ou pelo cabeçalho", () => {
  assert.equal(inferProvider(ANT, ""), "anthropic");
  assert.equal(inferProvider(OAI, ""), "openai");
  assert.equal(inferProvider(OAI, "anthropic"), "anthropic");
  assert.equal(readUserKeys(req({ "x-aula-ai-key": ANT })).provider, "anthropic");
});

test("sem o código, o servidor nunca usa as próprias chaves; com chave própria, usa só a dela", async () => {
  await withEnv({ AULA_ACCESS_CODE: "segredo", AI_PROVIDER: "openai", OPENAI_API_KEY: "sk-servidor-0000000000000000", YOUTUBE_API_KEY: "yt-servidor-000000000000000" }, async () => {
    // visitante com chave Anthropic própria
    await withKeyContext(async () => {
      assert.equal(getAIProvider(), "anthropic");
      assert.equal(getAIModel(), "claude-sonnet-5-5");
      assert.equal(isAIConfigured(), true);
      assert.equal(youtubeKeyForRequest(), "", "não pode cair na chave do YouTube do servidor");
    })(req({ "x-aula-ai-key": ANT }), {});
    // com a chave do YouTube própria
    await withKeyContext(async () => { assert.equal(youtubeKeyForRequest(), YT); })(req({ "x-aula-ai-key": ANT, "x-aula-youtube-key": YT }), {});
    // dono com o código: continua com as chaves do servidor
    await withKeyContext(async () => {
      assert.equal(getAIProvider(), "openai");
      assert.equal(isAIConfigured(), true);
      assert.equal(youtubeKeyForRequest(), "yt-servidor-000000000000000");
    })(req({ "x-aula-access-code": "segredo" }), {});
    // sem código e sem chave: IA não configurada (e não usa a do servidor)
    await withKeyContext(async () => {
      assert.equal(isAIConfigured(), false);
      await assert.rejects(() => callJson([{ role: "user", content: "oi" }]), (error) => error.code === "AI_KEY_MISSING");
      assert.equal(youtubeKeyForRequest(), "");
    })(req(), {});
  });
});

test("a chave própria vai só ao endereço oficial do provedor, nunca a um endereço do servidor", async () => {
  await withEnv({ AULA_ACCESS_CODE: "segredo", ANTHROPIC_BASE_URL: "https://proxy.exemplo.invalid" }, async () => {
    const calls = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => { calls.push({ url: String(url), key: init.headers["x-api-key"] }); return new Response(JSON.stringify({ content: [{ type: "text", text: "{\"ok\":true}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 }); };
    try {
      let result;
      await withKeyContext(async () => { result = await callJson([{ role: "user", content: "oi" }], { maxTokens: 300 }); })(req({ "x-aula-ai-key": ANT }), {});
      assert.deepEqual(result, { ok: true });
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
      assert.equal(calls[0].key, ANT);
    } finally { globalThis.fetch = realFetch; }
  });
});

test("Testar chave: aceita, recusa, sem chave de YouTube e erro de rede", async () => {
  const make = (map) => async (url) => { const hit = Object.entries(map).find(([part]) => String(url).includes(part)); if (!hit) throw new Error("rede"); const [status, body] = hit[1]; return new Response(JSON.stringify(body || {}), { status }); };
  let result = await testKeys({ aiKey: ANT, youtubeKey: YT }, make({ "api.anthropic.com": [200, { data: [] }], "googleapis.com": [200, { items: [] }], "awesomeapi": [200, { USDBRL: { bid: "5.40" } }] }));
  assert.equal(result.ok, true); assert.equal(result.provider, "anthropic"); assert.equal(result.model, "claude-sonnet-5-5"); assert.ok(result.pricing?.price);
  result = await testKeys({ aiKey: OAI }, make({ "api.openai.com": [401, { error: { message: "bad" } }] }));
  assert.equal(result.ok, false); assert.match(result.ai.message, /recusou/); assert.equal(result.youtube.skipped, true);
  result = await testKeys({ aiKey: ANT, youtubeKey: YT }, make({ "api.anthropic.com": [200, {}], "googleapis.com": [400, { error: { errors: [{ reason: "keyInvalid" }] } }] }));
  assert.equal(result.ok, false); assert.match(result.youtube.message, /recusou/);
  result = await testKeys({ aiKey: ANT }, make({}));
  assert.equal(result.ok, false); assert.match(result.ai.message, /Não consegui falar/);
  result = await testKeys({}, make({}));
  assert.equal(result.ok, false); assert.match(result.ai.message, /Informe a chave/);
});

test("variável só com traço (campo pulado no Deploy to Vercel) não conta como chave", async () => {
  const { envKey } = await import("../src/user-keys.js");
  assert.equal(envKey("X", { X: "-" }), "");
  assert.equal(envKey("X", { X: "  " }), "");
  assert.equal(envKey("X", {}), "");
  assert.equal(envKey("X", { X: "sk-ant-abc" }), "sk-ant-abc");
  await withEnv({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "-" }, () => assert.equal(isAIConfigured(), false));
});
