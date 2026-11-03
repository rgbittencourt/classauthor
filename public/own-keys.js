// Chaves de API próprias da pessoa (IA e YouTube): ficam só na memória desta aba (somem ao fechar ou
// recarregar, como o código de acesso) e seguem em cabeçalhos x-aula-* a cada pedido ao servidor.
// O servidor usa a chave no pedido e não a guarda nem a registra.

const state = { provider: "anthropic", aiKey: "", youtubeKey: "", model: "", pricing: null };
let onChange = () => {};

export const ownKeys = {
  has: () => Boolean(state.aiKey),
  provider: () => state.provider,
  hasYoutube: () => Boolean(state.youtubeKey),
  model: () => state.model,
  pricing: () => state.pricing,
  set(next) { Object.assign(state, { provider: next.provider || "anthropic", aiKey: next.aiKey || "", youtubeKey: next.youtubeKey || "", model: next.model || "", pricing: next.pricing || null }); onChange(); },
  clear() { Object.assign(state, { aiKey: "", youtubeKey: "", model: "", pricing: null }); onChange(); },
  onChange(fn) { onChange = typeof fn === "function" ? fn : () => {}; }
};

// Acrescenta as chaves a todo pedido à API do próprio servidor (/api/...), num único ponto.
export function installKeyFetch() {
  if (window.__classauthorKeyFetch) return;
  window.__classauthorKeyFetch = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      const url = typeof input === "string" ? input : input?.url || "";
      const path = url.startsWith("/") ? url : (() => { try { const u = new URL(url, location.href); return u.origin === location.origin ? u.pathname : ""; } catch { return ""; } })();
      if (state.aiKey && path.startsWith("/api/") && !path.startsWith("/api/test-keys")) {
        const headers = new Headers(init?.headers || (typeof input !== "string" ? input.headers : undefined));
        headers.set("x-aula-ai-key", state.aiKey);
        headers.set("x-aula-ai-provider", state.provider);
        if (state.youtubeKey) headers.set("x-aula-youtube-key", state.youtubeKey);
        return nativeFetch(input, { ...(init || {}), headers });
      }
    } catch { /* segue sem as chaves */ }
    return nativeFetch(input, init);
  };
}

export async function testKeysOnServer(values) {
  const response = await fetch("/api/test-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "testkeys", provider: values.provider, aiKey: values.aiKey, youtubeKey: values.youtubeKey }) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Abre a janela de chaves. Devolve uma promessa: true se a pessoa salvou chaves que funcionam, false se cancelou.
export function openKeysModal({ required = false } = {}) {
  const modal = document.getElementById("keys-modal");
  if (!modal) return Promise.resolve(false);
  const $ = (id) => document.getElementById(id);
  const provider = $("keys-provider"), aiKey = $("keys-ai"), youtube = $("keys-youtube"), status = $("keys-status"), go = $("keys-go"), cancel = $("keys-cancel"), close = $("keys-close"), clear = $("keys-clear");
  provider.value = state.provider; aiKey.value = state.aiKey; youtube.value = state.youtubeKey;
  $("keys-required-note").hidden = !required;
  clear.hidden = !ownKeys.has();
  const say = (text, tone = "") => { status.textContent = text; status.className = `keys-status ${tone}`.trim(); };
  say("");
  const updateLabel = () => { const name = provider.value === "anthropic" ? "Anthropic (Claude)" : "OpenAI"; $("keys-ai-label").textContent = `Chave de IA da ${name}`; $("keys-ai-help").innerHTML = provider.value === "anthropic" ? 'Crie em <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com/settings/keys</a> (a conta precisa ter crédito).' : 'Crie em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com/api-keys</a> (a conta precisa ter crédito).'; };
  updateLabel();
  modal.classList.remove("hidden"); modal.setAttribute("aria-hidden", "false");
  return new Promise((resolve) => {
    const finish = (answer) => {
      modal.classList.add("hidden"); modal.setAttribute("aria-hidden", "true");
      go.onclick = null; cancel.onclick = null; close.onclick = null; clear.onclick = null; provider.onchange = null; modal.onkeydown = null;
      resolve(answer);
    };
    provider.onchange = updateLabel;
    cancel.onclick = () => finish(false);
    close.onclick = () => finish(false);
    modal.onkeydown = (event) => { if (event.key === "Escape") finish(false); };
    clear.onclick = () => { ownKeys.clear(); say("Chaves removidas desta aba.", "ok"); finish(false); };
    go.onclick = async () => {
      const values = { provider: provider.value, aiKey: aiKey.value.trim(), youtubeKey: youtube.value.trim() };
      if (!values.aiKey) { say("Informe a chave de IA: sem ela não dá para gerar as aulas.", "error"); aiKey.focus(); return; }
      go.disabled = true; say("Testando as chaves (não gasta crédito de IA)…");
      try {
        const result = await testKeysOnServer(values);
        if (!result.ai?.ok) { say(result.ai?.message || "A chave de IA não funcionou.", "error"); return; }
        if (!result.youtube?.ok) { say(result.youtube?.message || "A chave do YouTube não funcionou.", "error"); return; }
        ownKeys.set({ ...values, model: result.model, pricing: result.pricing });
        finish(true);
      } catch {
        say("Não consegui testar agora. Confira a conexão e tente de novo.", "error");
      } finally { go.disabled = false; }
    };
    $("keys-test-note").textContent = "Ao clicar em Usar estas chaves, o ClassAuthor primeiro testa cada uma (consulta gratuita, sem gastar crédito de IA).";
    aiKey.focus();
  });
}
