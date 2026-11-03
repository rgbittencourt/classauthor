# Histórico de versões do ClassAuthor

Segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/) (MAIOR.MENOR.CORREÇÃO):

- **MAIOR**: muda algo que quebra o que já existia (formato de arquivo que deixa de abrir, rota removida).
- **MENOR**: recurso novo que não quebra nada.
- **CORREÇÃO**: conserto sem recurso novo.

A versão aparece no rodapé do aplicativo, em `GET /api/health` (campo `version`), em `package.json` e em `src/version.js`. O teste `tests/version.test.mjs` garante que os quatro lugares dizem o mesmo número.

## 1.6.0 · 03/11/2026 · Pacote único de entrega

### Novo
- **O pacote completo (ZIP) agora é o pacote de entrega**: além das semanas, ele leva a pasta `coordenacao/` com o **Mapa de alinhamento** (`mapa-de-alinhamento.xlsx`) e, se a Ficha da disciplina estiver preenchida, o **Plano de Ensino** (`plano-de-ensino-….docx`).
- **LEIA-ME.txt** na raiz do ZIP: diz o que há em cada pasta e **o que ainda está pendente** (semanas não liberadas, lacunas do mapa de alinhamento, ficha por preencher ou com avisos, falta de planilha de produção). O pacote não finge estar completo.
- Nova subpasta de projeto **coordenacao** (Ficha e Mapa agora são salvos nela, e não em «professor»).

## 1.5.0 · 03/11/2026 · Ficha da disciplina (Plano de Ensino)

### Novo
- **Ficha da disciplina** (botão na coluna «Ações do projeto»): monta o **Plano de Ensino no modelo do IFSC** a partir do que o ClassAuthor já planejou e baixa em **Word (.docx)**, com cabeçalho (logotipo do IFSC), as seis seções do modelo (ementa, objetivos, conteúdo programático e carga horária, método de ensino e recursos didáticos, avaliação, instrumentos e critérios) e as referências, mais o rodapé institucional.
- O que o app preenche sozinho: unidade curricular (título do curso), **C.H.** (semanas × horas por semana), **ano/semestre** (pela data de início), **ementa** (temas das semanas), **objetivos** (os do briefing), **conteúdo programático** (um tema por semana, com os títulos das seções como subitens), **método** (texto do modelo, com o número de encontros de prática e as metodologias ativas usadas) e **instrumentos** (atividades obrigatórias e questionários de cada semana, com o cronograma pelo calendário).
- O que ele **não inventa** e deixa para você: curso, e-mails dos professores, pesos dos instrumentos e quais valem nota. A ficha avisa o que falta («Antes de entregar») e mostra a soma dos pesos, que deve dar 100%.
- **Referências**: entram marcadas as da sua lista e as conferidas; as que a IA sugeriu e ninguém conferiu ficam **desmarcadas** (confirme que a obra existe antes de marcar), sem duplicar as repetidas entre semanas. Título em negrito pelos marcadores ** **.
- **Tudo é editável** na própria janela (professores, textos, tabela de instrumentos, referências). O texto da avaliação (Regimento Didático Pedagógico) é o do modelo do IFSC: confira se continua valendo. A ficha editada fica salva com o projeto (rascunho, backup e pasta do projeto); curso, professores, rodapé e logotipo ficam lembrados neste navegador para a próxima ficha. «Refazer a partir do planejamento» descarta as edições.
- Respeita «Aula» ou «Semana» nos textos do documento.

### Mudou por dentro
- Novos arquivos `src/ficha-disciplina.js` (dados e montagem do .docx, sem dependências; cópia idêntica em `public/`) e cópia de `abnt.js` em `public/` (ordenação ABNT das referências). Testes em `tests/ficha-disciplina.test.mjs`.

### Compatibilidade
- O backup ganhou o campo `results.ficha` (opcional). Backups antigos abrem como antes.

## 1.4.0 · 03/11/2026 · Mapa de alinhamento do curso

### Novo
- **Mapa de alinhamento** (botão na coluna «Ações do projeto»): cruza, semana a semana, os **objetivos** com as **atividades**, as **evidências**, as **questões da avaliação** e a **carga horária**, e aponta o que falta: objetivo sem atividade, sem questão ou sem evidência; verbo vago (nível de Bloom); atividade ou questão que não serve a nenhum objetivo; semana sem objetivos, sem atividade ou sem avaliação; carga calculada mais de 15% acima ou abaixo da meta; objetivo da UC que nenhuma semana parece cobrir (estimativa por palavras em comum, para você conferir); curso inteiro só nos níveis lembrar e entender. Cada lacuna tem o botão «Abrir semana» (ou «Abrir aula»). O mapa também baixa em **planilha (.xlsx)** com as abas Mapa, Carga e Lacunas.
- **Só conta vínculo de verdade.** Quando a IA não ligou um objetivo a uma atividade, evidência ou questão, o app já preenchia por rodízio para o campo não ficar vazio. Agora esses preenchimentos ficam marcados como **estimados** (campos `activitiesInferred`, `evidenceInferred` e `questionsInferred` na matriz de alinhamento): aparecem em itálico no mapa e **não fecham a lacuna**. Semanas geradas antes dessa versão não têm a marca e são lidas como declaradas.
- O mapa respeita «Aula» ou «Semana» nos rótulos, nos textos e na planilha.

### Mudou por dentro
- A taxonomia de Bloom foi para `src/bloom.js` (com cópia idêntica em `public/bloom.js`, que o navegador usa); `methodology.js` continua exportando as mesmas funções. `src/production-xlsx.js` ganhou `createWorkbookFromSheets`, que monta uma planilha a partir de abas; a planilha de produção funciona como antes.
- Testes novos (`tests/alignment-map.test.mjs`) conferem as regras de lacuna, a marca de estimado e as cópias idênticas dos arquivos compartilhados.

### Compatibilidade
- Nada muda nos arquivos salvos: os campos novos são só acrescentados à matriz de alinhamento. Backups e semanas antigas abrem como antes.

## 1.3.1 · 03/11/2026 · Manual Class dentro do app

**Acrescentado**
- Botão **Manual ↗** no cabeçalho: abre o Manual Class (HTML) numa aba nova, direto no capítulo do ClassAuthor. O manual é servido pelo próprio app, em `/manual/`.

**Corrigido**
- O título da aba do navegador voltou a ser «ClassAuthor - Planejamento pedagógico» (tinha ficado «ClassAuthor · TESTE», da cópia de teste). Os três apps seguem o mesmo padrão: «Nome - Frase com inicial maiúscula».

## 1.3.0 · 30/10/2026 · metodologia, plano da aula e pasta do projeto

Aprovada na cópia de teste (ramo `metodologia`). Compatível com os backups e rascunhos da 1.2.1: planejamentos antigos continuam em "Semana" e, sem metodologia escolhida, a geração segue como antes.

### Novo
- **Abordagem pedagógica** (atual ou nova: planejamento reverso, Bloom revisada, alinhamento construtivo, princípios de Mayer) e **metodologia ativa** por aula: sala de aula invertida, estudo de caso, ABP/PBL, projetos, instrução por pares, gamificação, júri simulado/debate, rotação por estações, design thinking ou "a IA escolhe e justifica". Também por prática.
- **Plano da aula antes de gerar**: a IA mostra como pensa montar a aula com a metodologia; o professor responde, pede "Refazer o plano" ou aprova e gera.
- **Como aplicar a metodologia**: guia na prévia e no Material de Mediação (antes da aula, fases, o que o professor e o estudante fazem, como acompanhar, sinais de sucesso e de alerta, avaliação, armadilhas e adaptações).
- **Medidor de Bloom** dos objetivos e regras de Bloom em "Preencher vazios com IA".
- **Voz humana**: regras de escrita e conferência de clichês de IA.
- **Figuras de três tipos**: diagrama (desenhado pela IA), foto (pedido pronto para gerar fora) e Napkin (texto para colar no napkin.ai). Na aba 4, a quantidade de cada tipo por aula (vazio = a IA decide). Diagrama que não sair traz pedido pronto para o ChatGPT e texto para o Napkin; botão "Criar figuras pendentes".
- **Apostila ou livro como fonte** (PDF ou DOCX) nos Materiais de apoio, com uso (base, complementar, exercícios) e páginas por aula; materiais de apoio passam a dizer de onde vêm (autor, obra, onde encontrar).
- **Práticas/Laboratório** (antes "Webpráticas síncronas"), com modalidade: webprática síncrona, laboratório prático ou aula síncrona.
- **Organizar o curso por Aula ou Semana** (só os nomes mudam, nos rótulos, nos arquivos e nos documentos).
- **Pasta do projeto** (Chrome e Edge no computador): tudo o que o ClassAuthor salva vai para uma pasta do curso, com as subpastas backup, classatelier, classauthor, moodle, professor, praticas, producao, pacotes, fontes e textos. O rascunho é gravado em backup/rascunho-atual.json a cada alteração; "Abrir pasta de projeto" retoma o planejamento em outro navegador ou computador.

### Mudou
- Aba **Produção audiovisual** depois de "Aulas planejadas"; as duas visões de carga reunidas em "Carga por atividade".
- **Citação** só com fonte completa (autor, obra, ano e página); sem fonte, vai para "Pontos a conferir". O **pitaco** passa a ser "Dica do professor": dica, lembrete, aviso ou detalhe importante, escrito pela IA no ponto certo do texto.
- Espaçamento do formulário refeito.

### Corrigido
- Resposta vazia do Claude 5.x por limite de saída (raciocínio prévio desligado e nova tentativa com mais espaço).
- Barra de progresso some depois de aprovar o plano; "Refazer o plano" exigia instrução.

## 1.2.1 · 29/10/2026 · marca com fundo claro

### Mudou
- A **marca do ClassAuthor** passou a ter o quadrado de fundo claro (creme), como a do ClassAtelier e a do ClassAcervo: arco azul-marinho com o painel coral aceso e a caneta por cima, com um contorno claro que a separa do arco. Vale para o símbolo (`classauthor-mark.svg` e `.png`), o logo horizontal (`classauthor-logo.svg` e `.png`, `logo.svg`), o favicon (`favicon.svg`, `favicon-32.png`), o ícone da tela inicial (`apple-touch-icon.png`) e para a capa de entrada e o cabeçalho do app. A capa de compartilhamento (`classauthor-cover.*`) segue como estava, igual à dos outros dois apps (marca direto no fundo azul).

## 1.2.0 · 29/10/2026 · figura avulsa para o ClassAtelier

### Novo
- Rota **`POST /api/figure`**: cria **uma** figura (diagrama ou ilustração em SVG, com legenda, texto alternativo e o crédito «Ilustração criada por IA») a partir de uma descrição. É o que o botão **Inserir imagem no cursor → Criar com IA** do ClassAtelier 1.3.0 usa. Não é uma função nova da Vercel: segue dentro de `api/regenerate-week.js` (limite de 12 funções do plano Hobby).
- **CORS restrito**: só responde a páginas de `https://rgbittencourt.github.io` e de `localhost`/`127.0.0.1`; outros endereços recebem 403. Para liberar outro endereço, use a variável `AULA_CORS_ORIGINS` (lista separada por vírgulas).
- Com `AULA_ACCESS_CODE` configurado, o código continua obrigatório (cabeçalho `x-aula-access-code`), como nas demais rotas de IA.
- `src/figure-handler.js` e testes em `tests/figure-handler.test.mjs`.

### Compatibilidade
- Nada quebra. Sem chave de IA configurada, a rota responde 503 com a mensagem de sempre.

## 1.1.0 · 29/10/2026 · abrir semana salva

### Novo
- Botão **Abrir semana salva**, ao lado de *Baixar backup* e *Restaurar backup*: reabre no ClassAuthor o arquivo `SemanaNN-título-ClassAuthor.json` (a semana completa, com quiz, feedbacks e guia do professor), que até aqui só podia ser guardado.
- A semana entra no **lugar da mesma semana** do planejamento aberto (com confirmação, mostrando a atual e a do arquivo), ou como **a próxima**, se for a seguinte à última. As outras semanas não mudam. A liberação da semana volta a ficar pendente e a versão editada no ClassAtelier dessa semana é descartada (o aviso diz isso).
- O número da semana vem do arquivo (`lessonPlan.weekNumber`, depois o título, depois o nome do arquivo).
- Recusas com mensagem clara: JSON inválido, backup do planejamento (aponta *Restaurar backup*), arquivo do ClassAtelier (aponta o ClassAtelier), semana vazia e salto de sequência (por exemplo, abrir a Semana 5 com 3 semanas no planejamento).
- Módulo `src/week-import.js` (cópia em `public/`) com testes em `tests/week-import.test.mjs`.

### Compatibilidade
- Nada quebra: os arquivos e backups de antes continuam abrindo como antes.

## 1.0.0 · 29/10/2026 · primeira versão de produção

Marca a passagem para produção em `classauthor.vercel.app`, com o nome ClassAuthor (antes, versão de desenvolvimento 0.1.0).

### O que o aplicativo faz nesta versão
- Planejamento do curso a partir de um briefing (identidade, calendário, objetivos, recursos, webpráticas) e geração **semana a semana**, com aprovação antes de gerar a seguinte; geração retomável quando falha no meio.
- Provedores de IA OpenAI e Anthropic, escolhidos por variável de ambiente; modo exemplo quando não há chave.
- Referências no padrão ABNT NBR 6023, conferência de citações e pontos a conferir antes de publicar.
- Cartões por semana com os arquivos `SemanaNN-título-ClassAtelier.json`, `…-ClassAuthor.json` e `…-Quiz.xml` (Moodle XML), pacote completo ZIP, Material de Mediação em PDF e roteiros de webprática em DOCX.
- Botão **Abrir ClassAtelier** e **Enviar de volta** entre abas, com conferência de origem.
- Rascunho e backup no navegador; instalável como aplicativo (manifesto, sem modo offline).

### Mudanças que quebram compatibilidade com a 0.1.0
- Nomes de arquivo, chaves de armazenamento (`classauthor:*`) e mensagens entre abas (`classatelier:*`) mudaram. **Não exige ação:** rascunhos, preferências e backups antigos são migrados ou aceitos na primeira abertura.

### Ainda não verificado
- Geração com IA real e a qualidade das referências (rodar `scripts/smoke-ai.mjs` com chave própria).
- Importação do quiz e do SCORM em um Moodle real.
