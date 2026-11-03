// Índice (LEIA-ME.txt) do pacote de entrega: o que há em cada pasta e o que ainda está pendente.
//
// Código puro (sem Node): public/delivery-package.js é cópia idêntica deste arquivo e roda no navegador.
// O pacote só é "entregável" se disser a verdade sobre o que falta; por isso o índice lista as
// pendências conhecidas (semanas não liberadas, lacunas do mapa de alinhamento, ficha incompleta).

export const PACKAGE_FOLDERS = Object.freeze({
  coordenacao: "Para a coordenação: Plano de Ensino (ficha da disciplina) e Mapa de alinhamento do curso",
  classatelier: "Aulas para abrir e editar no ClassAtelier (…-ClassAtelier.json)",
  classauthor: "Aulas completas do ClassAuthor, com questionário, feedbacks e guia do professor (…-ClassAuthor.json)",
  moodle: "Questões para importar no Moodle (XML) e rubricas de avaliação em CSV (moodle/rubricas/, para o plugin Rubric Importer)",
  professor: "Material de Mediação do professor (PDF) e rubricas em planilha (rubricas.xlsx), quando você as pediu",
  praticas: "Roteiros das práticas, laboratórios e aulas síncronas (DOCX e anexos)",
  producao: "Produção audiovisual: planilha e roteiros de vídeo"
});

const list = (items) => items.map((item) => `  - ${item}`).join("\n");

// files: caminhos dentro do ZIP. pending: { weeks: [números], alignment: { issues, withoutActivity, ... } | null,
// ficha: [avisos] | null (null = ainda não preenchida) }.
export function deliveryReadme({ title = "Curso", version = "", date = new Date(), files = [], pending = {}, unitLabel = "Semana" } = {}) {
  const day = date.toLocaleDateString("pt-BR");
  const folders = Object.keys(PACKAGE_FOLDERS).map((name) => ({ name, count: files.filter((path) => path.startsWith(`${name}/`)).length })).filter((item) => item.count > 0);
  const out = [
    `PACOTE DE ENTREGA — ${title}`,
    `Montado em ${day} pelo ClassAuthor${version ? ` ${version}` : ""}.`,
    "",
    "O QUE HÁ EM CADA PASTA",
    ...folders.map((item) => `  ${item.name}/  (${item.count} arquivo${item.count === 1 ? "" : "s"})\n      ${PACKAGE_FOLDERS[item.name]}`),
    files.includes("planejamento-geral.json") ? "  planejamento-geral.json\n      Planejamento geral do curso (carga, progressão, checklists), em JSON" : "",
    "",
    "O QUE AINDA ESTÁ PENDENTE"
  ].filter((line, index, all) => !(line === "" && all[index - 1] === ""));
  const todo = [];
  if (pending.weeks?.length) todo.push(`${unitLabel === "Aula" ? "Aulas" : "Semanas"} ainda não liberadas (qualidade ou revisão pendente): ${pending.weeks.join(", ")}. Abra a prévia de cada uma e confira o que falta.`);
  if (pending.alignment && pending.alignment.issues > 0) todo.push(`O Mapa de alinhamento aponta ${pending.alignment.issues} lacuna(s): ${pending.alignment.withoutActivity} objetivo(s) sem atividade, ${pending.alignment.withoutQuestion} sem questão na avaliação, ${pending.alignment.withoutEvidence} sem evidência. Veja coordenacao/mapa-de-alinhamento.xlsx (aba Lacunas).`);
  if (pending.ficha === null) todo.push("A Ficha da disciplina (Plano de Ensino) ainda não foi preenchida, por isso não está neste pacote. Use o botão «Ficha da disciplina», confira os dados e baixe de novo o pacote.");
  else if (Array.isArray(pending.ficha)) pending.ficha.forEach((item) => todo.push(`Ficha da disciplina: ${item}`));
  if (Array.isArray(pending.rubrics)) pending.rubrics.forEach((item) => todo.push(`Rubrica: ${item}`));
  if (!files.some((path) => path.startsWith("producao/"))) todo.push("Não há planilha de produção audiovisual (nenhum roteiro foi gerado).");
  out.push(todo.length ? list(todo) : "  Nada pendente conhecido.", "", "Conteúdo elaborado com ClassAuthor, uma ferramenta de planejamento pedagógico desenvolvida por Rogério Bittencourt, INOVALAB - IFSC.", "Revise o material antes de publicar: o texto foi escrito com apoio de IA e precisa passar pelo seu olhar.");
  return out.join("\n");
}
