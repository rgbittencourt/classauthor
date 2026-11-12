import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { figureImageName, figureStatusList, figureSuggestions, insertedFigureIds } from "../src/figure-suggestions.js";
import { SUBFOLDERS, subfolderFor } from "../public/project-folder.js";

const week = {
  lessonPlan: {
    contentSections: [
      { number: "1", title: "Problema", figures: [
        { id: "w2-f1", kind: "foto", description: "Rua alagada", prompt: "Foto de rua alagada", caption: "Alagamento." },
        { id: "w2-f2", kind: "diagrama", description: "Ciclo", src: "data:image/svg+xml;base64,AAA" }
      ] },
      { number: "2", title: "Conceito", figures: [
        { id: "w2-f3", kind: "napkin", description: "Hierarquia", napkinText: "A > B > C", sectionNumber: "2" },
        { id: "w2-f4", description: "Fluxo sem tipo" }
      ] }
    ]
  }
};

test("lista só as figuras sem imagem, com o tipo e a seção", () => {
  const list = figureSuggestions(week, 2);
  assert.deepEqual(list.map((f) => f.id), ["w2-f1", "w2-f3", "w2-f4"]);
  assert.equal(list[0].kind, "foto");
  assert.equal(list[1].kind, "napkin");
  assert.equal(list[2].kind, "diagrama");
  assert.equal(list[1].sectionTitle, "Conceito");
  assert.equal(list[0].weekNumber, 2);
  assert.deepEqual(figureSuggestions({}), []);
});

test("figura inserida é a que tem bloco de imagem com slotId figure-<id> e src", () => {
  const blocks = [
    { id: "a", type: "topic", props: { children: [{ id: "i1", type: "imagem", props: { slotId: "figure-w2-f1", src: "data:image/png;base64,AA" } }] } },
    { id: "b", type: "imagem", props: { slotId: "figure-w2-f3", src: "" } },
    { id: "c", type: "imagem", props: { slotId: "outra", src: "x" } }
  ];
  assert.deepEqual([...insertedFigureIds(blocks)], ["w2-f1"]);
  const status = figureStatusList(week, { blocks, done: { "w2-f4": true }, weekNumber: 2 });
  assert.deepEqual(status.map((f) => [f.id, f.inserted, f.how]), [["w2-f1", true, "editor"], ["w2-f3", false, ""], ["w2-f4", true, "manual"]]);
});

test("nome do arquivo de cópia: semana, número da figura e tipo", () => {
  assert.equal(figureImageName("w2-f1", "napkin", "PNG"), "S2-fig-1-napkin.png");
  assert.equal(figureImageName("w10-f12", "foto", ".jpg"), "S10-fig-12-foto.jpg");
  assert.equal(figureImageName("", "foto", "webp", { weekNumber: 3, stamp: "20261112-1045" }), "S3-imagem-20261112-1045.webp");
  assert.equal(figureImageName("", "foto", "", { stamp: "x" }), "imagem-x.png");
});

test("a pasta do projeto tem imagens/ e fontes/, e imagem vai para imagens/", () => {
  assert.ok(SUBFOLDERS.some(([name]) => name === "imagens"));
  assert.ok(SUBFOLDERS.some(([name]) => name === "fontes"));
  for (const name of ["S2-fig-1-napkin.png", "a.JPG", "b.webp", "c.svg", "d.gif"]) assert.equal(subfolderFor(name), "imagens", name);
});

test("public/figure-suggestions.js é cópia idêntica de src/", () => {
  assert.equal(readFileSync(new URL("../public/figure-suggestions.js", import.meta.url), "utf8"), readFileSync(new URL("../src/figure-suggestions.js", import.meta.url), "utf8"));
});
