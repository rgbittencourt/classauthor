import test from "node:test";
import assert from "node:assert/strict";
import { abntIssues, abntRules, sortReferencesAbnt, abntToday } from "../src/abnt.js";
import { referenceItemHtml } from "../src/student-export.js";
import { parseWeekMarkdown, planToMarkdown } from "../src/writer-markdown.js";

test("ABNT: ordena em ordem alfabética ignorando acento e negrito", () => {
  const sorted = sortReferencesAbnt([
    { citation: "SILVA, Ana. **Título**. São Paulo: X, 2020." },
    { citation: "ÁVILA, Bruno. **Obra**. Rio: Y, 2019." },
    { citation: "BRASIL. **Lei nº 9.394**. Brasília, 1996." }
  ]).map((item) => item.citation.split(/[,.]/)[0]);
  assert.deepEqual(sorted, ["ÁVILA", "BRASIL", "SILVA"]);
});

test("ABNT: conferência de forma aponta o que falta", () => {
  assert.deepEqual(abntIssues("SILVA, Ana. **Gestão escolar**. 2. ed. São Paulo: Cortez, 2020."), []);
  assert.ok(abntIssues("gestão educacional na era digital").length >= 2);
  assert.ok(abntIssues("SILVA, Ana. **Título**. São Paulo: X, 2020. Disponível em: https://exemplo.org.").some((m) => /Acesso em/.test(m)));
  assert.ok(abntIssues({ citation: "SILVA, Ana. **Título**. São Paulo: X, 2020.", href: "https://exemplo.org" }).some((m) => /Disponível em/.test(m)));
  assert.ok(abntIssues("SILVA, Ana. Título sem destaque. São Paulo: X, 2020.").some((m) => /destaque/.test(m)));
});

test("ABNT: prompts trazem as regras e a data de acesso no formato da norma", () => {
  assert.match(abntRules("28 out. 2026"), /NBR 6023:2025/);
  assert.match(abntRules("28 out. 2026"), /Acesso em: 28 out\. 2026\./);
  assert.match(abntToday(new Date(2026, 9, 28)), /^28 out\. 2026$/);
});

test("ABNT: título em **negrito** vira <strong> no ClassAtelier e sobrevive ao ciclo markdown", () => {
  assert.equal(referenceItemHtml("SILVA, Ana. **Gestão <escolar>**. São Paulo: X, 2020."), "SILVA, Ana. <strong>Gestão &lt;escolar&gt;</strong>. São Paulo: X, 2020.");
  const md = "# Semana 1 — T\n\n## Referências desta semana\n\n- ZAGO, Rui. **Livro B**. Rio: Y, 2018.\n- ALVES, Eva. *Livro A*. Recife: Z, 2017.\n";
  const { lessonPlan: plan } = parseWeekMarkdown(md, { weekNumber: 1 });
  const refs = plan.references.map((r) => r.citation);
  assert.ok(refs.includes("ZAGO, Rui. **Livro B**. Rio: Y, 2018."));
  assert.ok(refs.includes("ALVES, Eva. **Livro A**. Recife: Z, 2017."));
  assert.match(planToMarkdown({ references: plan.references, title: "T", weekNumber: 1 }), /\*\*Livro B\*\*/);
});

test("Citação: só é citação com autor e obra/ano; sem isso vira destaque, nunca atribuída à 'Síntese da seção'", async () => {
  const { citationHasSource, materializeComposition, compositionPlanForWeek } = await import("../src/composition.js");
  assert.equal(citationHasSource("Paulo Freire", "Pedagogia da autonomia, 1996, p. 25"), true);
  assert.equal(citationHasSource("Síntese da seção", "Aula-base · conferir fonte se for citação literal"), false);
  assert.equal(citationHasSource("Autor", "Obra, ano"), false);
  assert.equal(citationHasSource("Paulo Freire", "Pedagogia da autonomia"), false);
  const input = { title: "Curso", weeks: 1, composition: {} };
  const weekPlan = compositionPlanForWeek({ ...input, compositionCounts: { citacao: 2 } }, 0);
  const rows = weekPlan.rows;
  rows.citacao = { ...(rows.citacao || {}), count: 2, policy: "require", itemsPerBlock: 1, label: "Citação" };
  const plan = { contentSections: [{ title: "Conceito", body: "<p>Texto da seção com ideia central.</p>" }], composition: [{ type: "citacao", quote: "Ensinar não é transferir conhecimento.", author: "Paulo Freire", source: "Pedagogia da autonomia, 1996, p. 47" }] };
  const { blocksBySection } = materializeComposition(plan, weekPlan, 1);
  const blocks = blocksBySection.flat();
  const real = blocks.find((block) => block.type === "citacao");
  assert.equal(real.props.author, "Paulo Freire");
  assert.equal(blocks.filter((block) => block.type === "citacao").length, 1);
  const degraded = blocks.find((block) => block.type === "destaque");
  assert.ok(degraded);
  assert.ok(!JSON.stringify(blocks).includes("Síntese da seção"));
});

test("Citação em bloco sem fonte vira pendência em 'Pontos a conferir'", async () => {
  const md = "# Semana 1 — T\n\n## 1. Seção\n\nTexto.\n\n> Educar é um ato de amor.\n\n> Ensinar exige rigor. — FREIRE, 1996, p. 29.\n";
  const { lessonPlan } = parseWeekMarkdown(md, { weekNumber: 1 });
  const flagged = lessonPlan.claimEvidence.filter((claim) => /Citação sem autor/.test(claim.claim));
  assert.equal(flagged.length, 1);
  assert.match(flagged[0].claim, /Educar é um ato de amor/);
});

// ───── Motor de formatação (regras R1 a R3, modelos T1 a T4, restrições de apresentação) ─────
import { formatAbnt, formatAbntList, abntAuthors, abntMonth, normalizeAbntCitation, citationFromHtml, citationToHtml, sortHtmlReferences, fixHtmlReference } from "../src/abnt.js";

test("ABNT R1: nomes de pessoa, 1 a 3 autores com \"; \", 4 ou mais com et al., entidade em maiúsculas", () => {
  assert.equal(abntAuthors("Florestan Fernandes"), "FERNANDES, Florestan");
  assert.equal(abntAuthors(["João Silva Filho"]), "SILVA FILHO, João");
  assert.equal(abntAuthors("FREIRE, Paulo"), "FREIRE, Paulo");
  assert.equal(abntAuthors(["Ana Souza", "Bia Lima", "Caio Rocha"]), "SOUZA, Ana; LIMA, Bia; ROCHA, Caio");
  assert.equal(abntAuthors("Ana Souza; Bia Lima; Caio Rocha; Davi Alves"), "SOUZA, Ana et al.");
  assert.doesNotMatch(abntAuthors("Ana Souza; Bia Lima; Caio Rocha; Davi Alves"), /[*_]et al/);
  assert.equal(abntAuthors("Universidade Federal de Santa Catarina"), "UNIVERSIDADE FEDERAL DE SANTA CATARINA");
  assert.equal(abntAuthors("Unesco"), "UNESCO");
  assert.equal(abntAuthors("Instituto Alfa", { entity: true }), "INSTITUTO ALFA");
});

test("ABNT R3: mês abreviado com 3 letras e ponto; maio por extenso", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(abntMonth), ["jan.", "fev.", "mar.", "abr.", "maio", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."]);
  assert.equal(abntMonth("Março"), "mar.");
  assert.equal(abntMonth("MAI."), "maio");
  assert.equal(abntMonth("setembro"), "set.");
  assert.equal(abntMonth("xyz"), "");
});

test("ABNT T1: livro no todo; 1ª edição omite a edição; negrito só no título principal", () => {
  assert.equal(formatAbnt({ tipo: "livro", autor: "Florestan Fernandes", titulo: "A revolução burguesa no Brasil", subtitulo: "ensaio de interpretação sociológica", edicao: "3", local: "Rio de Janeiro", editora: "Zahar", ano: 2005 }),
    "FERNANDES, Florestan. **A revolução burguesa no Brasil**: ensaio de interpretação sociológica. 3. ed. Rio de Janeiro: Zahar, 2005.");
  assert.equal(formatAbnt({ autores: "Ana Souza", titulo: "Gestão escolar", edicao: "1ª", local: "São Paulo", editora: "Cortez", ano: 2020 }), "SOUZA, Ana. **Gestão escolar**. São Paulo: Cortez, 2020.");
  assert.equal(formatAbnt({ autores: "Ana Souza", titulo: "Gestão", local: "SP", editora: "X" }), "SOUZA, Ana. **Gestão**. SP: X, [ano].");
});

test("ABNT T2: capítulo de livro com In:, (Org.) e páginas", () => {
  assert.equal(formatAbnt({ tipo: "capitulo", autores: ["Paulo Freire"], capitulo: "Educação e mudança", obraAutores: ["Maria Alves"], titulo: "Educar hoje", local: "Porto Alegre", editora: "Artmed", ano: 2018, paginas: "10 a 25" }),
    "FREIRE, Paulo. Educação e mudança. In: ALVES, Maria (Org.). **Educar hoje**. Porto Alegre: Artmed, 2018. p. 10-25.");
});

test("ABNT T3: artigo de periódico com v., n., p. e mês abreviado antes do ano", () => {
  assert.equal(formatAbnt({ tipo: "artigo", autores: "Ana Souza; João da Silva", titulo: "Avaliação formativa", revista: "Educação em Revista", local: "Belo Horizonte", volume: 10, numero: 2, paginas: "15–30", mes: 3, ano: 2020 }),
    "SOUZA, Ana; SILVA, João da. Avaliação formativa. **Educação em Revista**, Belo Horizonte, v. 10, n. 2, p. 15-30, mar. 2020.");
  assert.match(formatAbnt({ tipo: "artigo", autores: "Ana Souza", titulo: "T", revista: "R", mes: "maio", ano: 2021 }), /\*\*R\*\*, maio 2021\.$/);
});

test("ABNT T4 e R3: site com Disponível em e Acesso em; DOI vira URL", () => {
  assert.equal(formatAbnt({ tipo: "site", autores: "Universidade Federal de Santa Catarina", titulo: "Manual do aluno", subtitulo: "guia", ano: 2023, url: "https://ufsc.br/x", acesso: "2026-03-05" }),
    "UNIVERSIDADE FEDERAL DE SANTA CATARINA. **Manual do aluno**: guia. [S. l.: s. n.], 2023. Disponível em: https://ufsc.br/x. Acesso em: 5 mar. 2026.");
  assert.match(formatAbnt({ tipo: "site", autores: "UNESCO", titulo: "Relatório", ano: 2022, doi: "10.1000/xyz", acesso: "5 de maio de 2026" }), /Disponível em: https:\/\/doi\.org\/10\.1000\/xyz\. Acesso em: 5 maio 2026\.$/);
  assert.match(formatAbnt({ tipo: "site", autores: "UNESCO", titulo: "Relatório", ano: 2022, url: "https://x.org" }, { today: "28 out. 2026" }), /Acesso em: 28 out\. 2026\.$/);
});

test("ABNT: o que o motor gera passa na conferência de forma, sem pendências", () => {
  const cases = [
    { autores: "Ana Souza", titulo: "Gestão", subtitulo: "teoria", edicao: 2, local: "SP", editora: "X", ano: 2020 },
    { tipo: "capitulo", autores: "Paulo Freire", capitulo: "C", obraAutores: "Maria Alves", titulo: "L", local: "SP", editora: "X", ano: 2018, paginas: "1-9" },
    { tipo: "artigo", autores: "Ana Souza", titulo: "A", revista: "R", volume: 1, numero: 2, paginas: "3-4", mes: 5, ano: 2020 },
    { tipo: "site", autores: "UNESCO", titulo: "T", ano: 2022, url: "https://x.org" }
  ];
  for (const entry of cases) assert.deepEqual(abntIssues(formatAbnt(entry)), [], formatAbnt(entry));
});

test("ABNT: lista final em ordem alfabética, uma linha em branco entre as referências, sem marcadores", () => {
  const out = formatAbntList([
    { autores: "Zeca Zago", titulo: "B", ano: 2000, local: "A", editora: "B" },
    "ÁVILA, Bruno. **Obra**. Rio: Y, 2019.",
    { autores: "Ana Alves", titulo: "A", ano: 2001, local: "A", editora: "B" }
  ]);
  const blocks = out.split("\n\n");
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks.map((b) => b.split(",")[0]), ["ALVES", "ÁVILA", "ZAGO"]);
  assert.ok(blocks.every((b) => !b.includes("\n") && !/^[-*•\d]/.test(b)));
});

test("ABNT: correções seguras de uma referência já escrita (e idempotentes)", () => {
  const fixes = [
    ["SILVA, Ana; SOUZA, Bia; LIMA, Caio; ROCHA, Davi. **Título: sub**. 2ª ed. São Paulo: X, 2020.", "SILVA, Ana et al. **Título**: sub. 2. ed. São Paulo: X, 2020."],
    ["SILVA, A. B.; SOUZA, B.; LIMA, C.; ROCHA, D. *et al.* **T**. 1. ed. SP: X, 2020.", "SILVA, A. B. et al. **T**. SP: X, 2020."],
    ["FREIRE, Paulo (org.). **T**. SP: X, 2020.", "FREIRE, Paulo (Org.). **T**. SP: X, 2020."],
    ["SILVA, Ana. **T**. SP: X, 2020. Disponível em: https://x.org. Acesso em: 05 Maio. 2026.", "SILVA, Ana. **T**. SP: X, 2020. Disponível em: https://x.org. Acesso em: 5 maio 2026."],
    ["ALVES, Eva. Artigo. **Rev**, SP, v. 3, n. 1, p. 1-9, Mai. 2020.", "ALVES, Eva. Artigo. **Rev**, SP, v. 3, n. 1, p. 1-9, maio 2020."],
    ["SILVA, Ana. **T**. 2 ed. SP: X, 2020.", "SILVA, Ana. **T**. 2. ed. SP: X, 2020."]
  ];
  for (const [from, to] of fixes) {
    assert.equal(normalizeAbntCitation(from), to);
    assert.equal(normalizeAbntCitation(to), to);
    assert.deepEqual(abntIssues(to), [], to);
  }
  const ok = "SILVA, Ana; SOUZA, Bia; LIMA, Caio. **Gestão**: teoria. 2. ed. São Paulo: Cortez, 2020. Disponível em: https://x.org. Acesso em: 5 mar. 2026.";
  assert.equal(normalizeAbntCitation(ok), ok);
  assert.equal(normalizeAbntCitation("SILVA, Ana. **Título**. Local: Ed., 2020."), "SILVA, Ana. **Título**. Local: Ed., 2020.");
});

test("ABNT: a conferência aponta o que a norma decide (4+ autores, et al. em itálico, subtítulo em negrito, data de acesso)", () => {
  const has = (text, pattern) => abntIssues(text).some((m) => pattern.test(m));
  assert.ok(has("SILVA, Ana; SOUZA, Bia; LIMA, Caio; ROCHA, Davi. **T**. SP: X, 2020.", /et al/));
  assert.ok(has("SILVA, Ana *et al.* **T**. SP: X, 2020.", /itálico/));
  assert.ok(has("SILVA, Ana. **T: sub**. SP: X, 2020.", /subtítulo/));
  assert.ok(has("SILVA, Ana. **T**. SP: X, 2020. Disponível em: https://x.org. Acesso em: 5 mai. 2026.", /5 mar\. 2026/));
  assert.ok(has("SILVA, Ana. **T**. SP: X, 2020. Disponível em: <https://x.org>. Acesso em: 5 mar. 2026.", /sem os sinais/));
  assert.ok(has("SILVA, Ana. **T**. 1. ed. SP: X, 2020.", /1ª edição/));
});

test("ABNT: itens HTML do ClassAtelier vão e voltam sem perder o negrito e saem ordenados", () => {
  assert.equal(citationFromHtml("SILVA, Ana. <strong>Gestão &amp; <i>escola</i></strong>. SP: X, 2020."), "SILVA, Ana. **Gestão & escola**. SP: X, 2020.");
  assert.equal(citationToHtml("SILVA, Ana. **Gestão <1>**. SP: X, 2020."), "SILVA, Ana. <strong>Gestão &lt;1&gt;</strong>. SP: X, 2020.");
  assert.deepEqual(sortHtmlReferences(["ZAGO, R. <strong>B</strong>. 2000.", "ÁVILA, B. <strong>A</strong>. 2001.", "ALVES, E. <strong>C</strong>. 2002."]).map((h) => h.split(",")[0]), ["ALVES", "ÁVILA", "ZAGO"]);
});

test("ABNT: o roteiro em Markdown separa as referências por linha em branco, sem marcadores, e relê igual", () => {
  const plan = { weekNumber: 1, title: "T", references: [{ citation: "ZAGO, Rui. **Livro B**. Rio: Y, 2018." }, { citation: "ALVES, Eva. **Livro A**. Recife: Z, 2017." }] };
  const md = planToMarkdown(plan);
  assert.match(md, /ZAGO, Rui\. \*\*Livro B\*\*\. Rio: Y, 2018\.\n\nALVES, Eva\./);
  assert.doesNotMatch(md.split("## Referências desta semana")[1], /^\s*[-*] /m);
  const again = parseWeekMarkdown(`# Semana 1 — T\n\n## Referências desta semana\n\n${plan.references.map((r) => r.citation).join("\n\n")}\n`, { weekNumber: 1 }).lessonPlan.references.map((r) => r.citation);
  assert.deepEqual(again.sort(), ["ALVES, Eva. **Livro A**. Recife: Z, 2017.", "ZAGO, Rui. **Livro B**. Rio: Y, 2018."]);
});

test("ABNT: as referências da semana entram corrigidas e em ordem (normalizeLessonPlan)", async () => {
  const { normalizeLessonPlan } = await import("../src/aula-schema.js");
  const plan = normalizeLessonPlan({ references: [
    { citation: "ZAGO, Rui. **Livro**. 2ª ed. Rio: Y, 2018. Disponível em: https://x.org. Acesso em: 05 Mai. 2026." },
    "ALVES, Ana; LIMA, Bia; ROCHA, Caio; SOUZA, Davi. **Obra**. SP: X, 2020."
  ] }, { title: "Curso", weeks: 1 }, 0);
  assert.deepEqual(plan.references.map((r) => r.citation), [
    "ALVES, Ana et al. **Obra**. SP: X, 2020.",
    "ZAGO, Rui. **Livro**. 2. ed. Rio: Y, 2018. Disponível em: https://x.org. Acesso em: 5 maio 2026."
  ]);
});

// ───── Inferência: o que a norma resolve sem dúvida já sai corrigido (negrito do título, autor no formato) ─────
test("ABNT: acha o título e põe o negrito (livro, subtítulo, capítulo, artigo, site, lei, subórgão)", () => {
  const cases = [
    ["SILVA, Ana. Gestão escolar. 2. ed. São Paulo: Cortez, 2020.", "SILVA, Ana. **Gestão escolar**. 2. ed. São Paulo: Cortez, 2020."],
    ["FREIRE, Paulo. Pedagogia da autonomia: saberes necessários à prática educativa. São Paulo: Paz e Terra, 1996.", "FREIRE, Paulo. **Pedagogia da autonomia**: saberes necessários à prática educativa. São Paulo: Paz e Terra, 1996."],
    ["SILVA, A. B. Gestão. SP: X, 2020.", "SILVA, A. B. **Gestão**. SP: X, 2020."],
    ["SOUZA, Ana. Avaliação formativa. Educação em Revista, Belo Horizonte, v. 10, n. 2, p. 15-30, mar. 2020.", "SOUZA, Ana. Avaliação formativa. **Educação em Revista**, Belo Horizonte, v. 10, n. 2, p. 15-30, mar. 2020."],
    ["FREIRE, Paulo. Educação e mudança. In: ALVES, Maria (Org.). Educar hoje. Porto Alegre: Artmed, 2018. p. 10-25.", "FREIRE, Paulo. Educação e mudança. In: ALVES, Maria (Org.). **Educar hoje**. Porto Alegre: Artmed, 2018. p. 10-25."],
    ["UNESCO. Relatório global. 2022. Disponível em: https://x.org. Acesso em: 5 mar. 2026.", "UNESCO. **Relatório global**. 2022. Disponível em: https://x.org. Acesso em: 5 mar. 2026."],
    ["BRASIL. Lei nº 9.394, de 20 de dezembro de 1996. Estabelece as diretrizes e bases da educação nacional. Brasília, 1996.", "BRASIL. **Lei nº 9.394, de 20 de dezembro de 1996**. Estabelece as diretrizes e bases da educação nacional. Brasília, 1996."],
    ["BRASIL. Ministério da Educação. Base Nacional Comum Curricular. Brasília: MEC, 2018.", "BRASIL. Ministério da Educação. **Base Nacional Comum Curricular**. Brasília: MEC, 2018."]
  ];
  for (const [from, to] of cases) {
    assert.equal(normalizeAbntCitation(from), to);
    assert.equal(normalizeAbntCitation(to), to, "idempotente: " + to);
  }
});

test("ABNT: autor fora do formato vira SOBRENOME, Nome quando o resto confirma a estrutura", () => {
  assert.equal(normalizeAbntCitation("Paulo Freire. Pedagogia da autonomia. São Paulo: Paz e Terra, 1996."), "FREIRE, Paulo. **Pedagogia da autonomia**. São Paulo: Paz e Terra, 1996.");
  assert.equal(normalizeAbntCitation("Ana Souza e Bia Lima. Gestão. SP: X, 2020."), "SOUZA, Ana; LIMA, Bia. **Gestão**. SP: X, 2020.");
  assert.equal(normalizeAbntCitation("Silva, Ana. Gestão. SP: X, 2020."), "SILVA, Ana. **Gestão**. SP: X, 2020.");
  assert.equal(normalizeAbntCitation("Silva, A. B. Gestão. SP: X, 2020."), "SILVA, A. B. **Gestão**. SP: X, 2020.");
  assert.equal(normalizeAbntCitation("Ana Souza; Bia Lima; Caio Rocha; Davi Alves. Gestão. SP: X, 2020."), "SOUZA, Ana et al. **Gestão**. SP: X, 2020.");
  assert.equal(normalizeAbntCitation("Paulo Freire. **Pedagogia**. São Paulo: Paz e Terra, 1996."), "FREIRE, Paulo. **Pedagogia**. São Paulo: Paz e Terra, 1996.");
  assert.equal(normalizeAbntCitation("Wikipedia. Educação a distância. 2023. Disponível em: https://pt.wikipedia.org/wiki/EaD. Acesso em: 03 Nov. 2026."), "WIKIPEDIA. **Educação a distância**. 2023. Disponível em: https://pt.wikipedia.org/wiki/EaD. Acesso em: 3 nov. 2026.");
});

test("ABNT: sem estrutura clara (título solto, sem local/editora/ano) o texto não é adivinhado e segue para a conferência", () => {
  // a rede final: o título sempre sai em negrito; o que não existe ganha marcador no lugar certo
  assert.equal(normalizeAbntCitation("gestão educacional"), "GESTÃO educacional. [ano].");
  assert.equal(normalizeAbntCitation("SILVA, Ana."), "SILVA, Ana. **[título]**. [ano].");
  assert.equal(normalizeAbntCitation("https://exemplo.com/x"), "[TÍTULO]. [ano]. Disponível em: https://exemplo.com/x. Acesso em: [dia mês ano].");
});

test("ABNT: depois da correção nunca sobra «falta o destaque (negrito)» e a correção é idempotente", () => {
  const samples = ["Pedagogia da autonomia", "SILVA, Ana. 2020.", "SILVA, Ana.", "O estado de S. Paulo. 2020.", "https://exemplo.com/x", "Disponível em: https://x.br",
    "AUTOR XYZ. Algo estranho aqui sem nada, mais coisa e outra 12 ou 13.", "BRASIL. Ministério da Educação. Parâmetros curriculares. 1997.", "Gartner. Citizen Development."];
  for (const sample of samples) {
    const out = normalizeAbntCitation(sample);
    assert.ok(/\*\*[^*]+\*\*/.test(out) || /^(?:(?:O|A|OS|AS|UM|UMA) )?\[?[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9]{2,}/.test(out), sample); // sem autor: entrada pelo título, sem negrito
    assert.ok(!abntIssues(out).some((x) => /destaque|negrito/.test(x)), `${sample} -> ${out} -> ${abntIssues(out)}`);
    assert.equal(normalizeAbntCitation(out), out, `idempotente: ${sample}`);
  }
});

test("ABNT: o que falta e não dá para deduzir aparece na referência, no lugar certo, entre colchetes", () => {
  assert.equal(normalizeAbntCitation("SILVA, Ana. Gestão escolar."), "SILVA, Ana. **Gestão escolar**. [ano].");
  assert.equal(normalizeAbntCitation("SILVA, Ana. Gestão escolar. São Paulo: Cortez."), "SILVA, Ana. **Gestão escolar**. São Paulo: Cortez, [ano].");
  assert.equal(normalizeAbntCitation("WIKIPEDIA. Vibe coding. Disponível em: https://en.wikipedia.org/wiki/Vibe_coding."), "WIKIPEDIA. **Vibe coding**. [ano]. Disponível em: https://en.wikipedia.org/wiki/Vibe_coding. Acesso em: [dia mês ano].");
  assert.ok(abntIssues("SILVA, Ana. **Gestão escolar**. [ano].").some((x) => /\[ano\]/.test(x)));
  assert.ok(abntIssues("A. **B**, 2020. Disponível em: https://x.br. Acesso em: [dia mês ano].").some((x) => /\[dia mês ano\]/.test(x)));
  // não duplica
  const once = normalizeAbntCitation("SILVA, Ana. Gestão escolar.");
  assert.equal(normalizeAbntCitation(once), once);
});

test("ABNT: referências de sites e reportagens (autor entidade, ano colado ao título, aspas, data por extenso)", () => {
  const cases = {
    "Gartner. Citizen Development and Low-Code/No-Code platforms.": "GARTNER. **Citizen Development and Low-Code/No-Code platforms**. [ano].",
    "FORUM, It. Por que o vibe coding está deixando as empresas vulneráveis, 2026.": "FORUM, It. **Por que o vibe coding está deixando as empresas vulneráveis**. 2026.",
    "**GOOGLE Cloud**. Vibe Coding Explained: Tools and Guides, 2026.": "GOOGLE CLOUD. **Vibe Coding Explained**: Tools and Guides. 2026.",
    "IBM. Cost of a Data Breach Report 2025.": "IBM. **Cost of a Data Breach Report**. 2025.",
    "**IMASTERS**. Lovable: a falha, 2026.": "IMASTERS. **Lovable**: a falha. 2026.",
    "KARPATHY, A. Publicação original sobre vibe coding, X (Twitter), 2 de fevereiro de 2025.": "KARPATHY, A. **Publicação original sobre vibe coding**. X (Twitter), 2 fev. 2025.",
    'ROOSE, K. "Not a Coder? With A.I., Just Having an Idea Can Be Enough." The New York Times, 27 fev. 2025.': "ROOSE, K. Not a Coder? With A.I., Just Having an Idea Can Be Enough. **The New York Times**, 27 fev. 2025.",
    "Veracode. GenAI Code Security Report, 2025.": "VERACODE. **GenAI Code Security Report**. 2025.",
    "BRASIL. **Lei nº 14.533**, de 11 de janeiro de 2023 (institui a Política).": "BRASIL. **Lei nº 14.533, de 11 de janeiro de 2023** (institui a Política)."
  };
  for (const [from, to] of Object.entries(cases)) {
    const got = normalizeAbntCitation(from);
    assert.equal(got, to, from);
    assert.equal(normalizeAbntCitation(got), got, `idempotente: ${from}`);
  }
});

test("ABNT: obra sem autor com local, editora e ano entra pelo título (primeira palavra em maiúsculas, sem negrito — NBR 6023:2025)", () => {
  assert.equal(normalizeAbntCitation("Gestão educacional na era digital. São Paulo: X, 2020."), "GESTÃO educacional na era digital. São Paulo: X, 2020.");
  assert.equal(normalizeAbntCitation("**GESTÃO educacional na era digital**. São Paulo: X, 2020."), "GESTÃO educacional na era digital. São Paulo: X, 2020.");
  assert.equal(normalizeAbntCitation("O estado de S. Paulo. São Paulo: Abril, 2020."), normalizeAbntCitation("O estado de S. Paulo. São Paulo: Abril, 2020."));
  assert.deepEqual(abntIssues(normalizeAbntCitation("Gestão educacional na era digital. São Paulo: X, 2020.")), []);
});

test("ABNT: entidade com órgão e documento online sem editora ganha negrito no título; editora com ponto antes do ano é corrigida", () => {
  assert.equal(normalizeAbntCitation("BRASIL. Ministério da Educação. Base Nacional Comum Curricular. Brasília, 2018."), "BRASIL. Ministério da Educação. **Base Nacional Comum Curricular**. Brasília, 2018.");
  assert.equal(normalizeAbntCitation("MORAN, José. Novas tecnologias. Campinas: Papirus. 2000"), "MORAN, José. **Novas tecnologias**. Campinas: Papirus, 2000.");
  assert.match(normalizeAbntCitation("A. Disponível em: https://x.br. Acesso em: 3 nov. 2026."), /Acesso em: 3 nov\. 2026/);
});

test("ABNT: item HTML com link é corrigido e o link continua no lugar", () => {
  const out = fixHtmlReference('BRASIL. Ministério da Educação. Base Nacional Comum Curricular. Brasília, 2018. Disponível em: <a href="https://x.gov.br/bncc">https://x.gov.br/bncc</a>. Acesso em: 3 nov. 2026.');
  assert.match(out, /<strong>Base Nacional Comum Curricular<\/strong>/);
  assert.match(out, /Disponível em: <a href="https:\/\/x\.gov\.br\/bncc">https:\/\/x\.gov\.br\/bncc<\/a>\./);
  assert.doesNotMatch(out, /&lt;/);
});

test("ABNT: depois da correção automática só sobra o que falta de informação (ano, autor, data de acesso)", () => {
  const raw = [
    "SILVA, Ana. Gestão escolar. São Paulo: Cortez, 2020.",
    "Paulo Freire. Pedagogia da autonomia. São Paulo: Paz e Terra, 1996.",
    "SOUZA, Ana. Avaliação. Educação em Revista, BH, v. 1, n. 2, p. 3-9, mai. 2020.",
    "SILVA, Ana. Gestão escolar. São Paulo: Cortez."
  ];
  const left = raw.map((text) => abntIssues(normalizeAbntCitation(text)));
  assert.deepEqual(left.slice(0, 3), [[], [], []]);
  assert.deepEqual(left[3], ["falta o ano: troque [ano] pelo ano de publicação"]);
});

test("ABNT: erros de propósito (negrito na referência inteira, no autor ou na editora, espaços, caixa, autor-data) são desfeitos", () => {
  const ok = "FREIRE, Paulo. **Pedagogia da autonomia**. São Paulo: Paz e Terra, 1996.";
  for (const bad of [
    "**FREIRE, Paulo. Pedagogia da autonomia. São Paulo: Paz e Terra, 1996.**",
    "**Paulo Freire. Pedagogia da autonomia. São Paulo: Paz e Terra, 1996.**",
    "FREIRE, Paulo. **Pedagogia da autonomia. São Paulo: Paz e Terra, 1996.**",
    "**FREIRE, Paulo.** Pedagogia da autonomia. São Paulo: Paz e Terra, 1996.",
    "FREIRE, Paulo. Pedagogia da autonomia. **São Paulo**: Paz e Terra, 1996.",
    "FREIRE, Paulo. **Pedagogia** **da autonomia**. São Paulo: Paz e Terra, 1996.",
    "freire, paulo. pedagogia da autonomia. são paulo: paz e terra, 1996.",
    "FREIRE, PAULO. PEDAGOGIA DA AUTONOMIA. São Paulo: Paz e Terra, 1996.",
    "FREIRE,Paulo.Pedagogia da autonomia.São Paulo:Paz e Terra,1996",
    "FREIRE, Paulo.  Pedagogia da  autonomia .  São Paulo : Paz e Terra , 1996 .",
    "FREIRE, Paulo (1996). Pedagogia da autonomia. São Paulo: Paz e Terra."
  ]) {
    assert.equal(normalizeAbntCitation(bad), ok, bad);
    assert.deepEqual(abntIssues(normalizeAbntCitation(bad)), [], bad);
  }
  assert.ok(abntIssues("**FREIRE, Paulo. Pedagogia da autonomia. São Paulo: Paz e Terra, 1996.**").some((x) => /negrito/.test(x)));
});

test("ABNT: autor-entidade em minúsculas («gartner.») vira MAIÚSCULAS e o título seguinte sai em negrito, sem sobrar «falta o destaque»", () => {
  const out = normalizeAbntCitation("gartner. Citizen Development and Low-Code/No-Code platforms.");
  assert.equal(out, "GARTNER. **Citizen Development and Low-Code/No-Code platforms**. [ano].");
  assert.equal(normalizeAbntCitation(out), out);
  assert.ok(!abntIssues(out).some((x) => /destaque/.test(x)));
});
