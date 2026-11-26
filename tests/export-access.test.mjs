import test from "node:test";
import assert from "node:assert/strict";
import zipHandler from "../api/zip.js";
import teacherPdfHandler from "../api/teacher-pdf.js";

function responseStub() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; }
  };
}

test("ZIP e PDF docente exigem acesso quando há código configurado e respondem no-store", async (t) => {
  const previous = process.env.AULA_ACCESS_CODE;
  process.env.AULA_ACCESS_CODE = "codigo-de-teste-privado";
  t.after(() => {
    if (previous === undefined) delete process.env.AULA_ACCESS_CODE;
    else process.env.AULA_ACCESS_CODE = previous;
  });

  for (const [name, handler] of [["ZIP", zipHandler], ["PDF", teacherPdfHandler]]) {
    const response = responseStub();
    await handler({ method: "POST", headers: {}, body: {} }, response);
    assert.equal(response.statusCode, 401, `${name} deve negar uma requisição sem autorização`);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.match(response.body.error, /código de acesso/i);
  }
});
