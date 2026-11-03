import { timingSafeEqual } from "node:crypto";
import { readUserKeys, runWithUserKeys } from "./user-keys.js";

export function accessRequired() {
  return Boolean(process.env.AULA_ACCESS_CODE);
}

// O código de acesso confere (ou o servidor não exige código).
export function hasServerAccess(request) {
  const expected = process.env.AULA_ACCESS_CODE;
  if (!expected) return true;
  const supplied = request.headers["x-aula-access-code"];
  if (typeof supplied !== "string" || !supplied.length) return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Passa quem tem o código OU quem traz a própria chave de IA (e então gasta só a sua, nunca a do servidor).
export function hasValidAccess(request) {
  return hasServerAccess(request) || Boolean(readUserKeys(request).aiKey);
}

// Abre, para cada pedido, o contexto com as chaves próprias e a permissão de usar as chaves do servidor.
export function withKeyContext(handler) {
  return function keyContextHandler(request, response) {
    const keys = readUserKeys(request);
    const context = { aiKey: keys.aiKey, youtubeKey: keys.youtubeKey, provider: keys.provider, serverKeysAllowed: hasServerAccess(request) };
    return runWithUserKeys(context, () => handler(request, response));
  };
}
