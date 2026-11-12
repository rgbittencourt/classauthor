# Histórico de versões do ClassAuthor

Segue o [Versionamento Semântico](https://semver.org/lang/pt-BR/) (MAIOR.MENOR.CORREÇÃO):

- **MAIOR**: muda algo que quebra o que já existia (formato de arquivo que deixa de abrir, rota removida).
- **MENOR**: recurso novo que não quebra nada.
- **CORREÇÃO**: conserto sem recurso novo.

A versão aparece no rodapé do aplicativo, em `GET /api/health` (campo `version`), em `package.json` e em `src/version.js`. O teste `tests/version.test.mjs` garante que os quatro lugares dizem o mesmo número.

## 1.17.0 · 12/11/2026 · Slides para o ClassAtelier

- Nova rota **`/api/slides`** (com CORS, como `/api/figure`), usada pelo botão **Slides** do ClassAtelier. Com `mode: "frame"`, devolve a pergunta central da aula, os objetivos e a síntese; com `mode: "section"`, devolve os slides de uma seção. A IA escolhe só o conteúdo, dentro de um catálogo fechado de tipos (frase de impacto, cartões, comparação, etapas, fórmula, número de destaque, tabela, linha do tempo, pergunta para refletir, atenção, citação e figura da aula), com notas do apresentador; as perguntas «Para refletir» levam a resposta detalhada nas notas. O desenho dos slides é todo do ClassAtelier.
- Aceita o código de acesso ou a chave de IA própria, como as figuras. Nada muda no restante do ClassAuthor.

## 1.16.0 · 12/11/2026 · Materiais de apoio que não se perdem e imagens sugeridas com destino certo

**Materiais de apoio (apostilas e livros anexados)**

- Ao abrir o projeto, reconectar a pasta ou restaurar um backup, o ClassAuthor confere se o texto de cada arquivo anexado está neste navegador. Se não estiver, ele **relê o arquivo da subpasta `fontes/`** da pasta do projeto e extrai o texto de novo, sem você reanexar nada.
- Se não der (pasta não conectada, sem permissão ou arquivo ausente em `fontes/`), o cartão do material mostra um **aviso visível**: «Texto não encontrado neste navegador…», com o que fazer.
- Ao anexar um arquivo, o cartão agora diz se a **cópia foi gravada em `fontes/`** ou por que não foi (sem pasta, sem permissão, erro). Antes a falha era silenciosa.
- Ao clicar em «Gerar com IA», se algum material marcado para uso não tem texto neste navegador, o app avisa que a IA vai gerar **sem** o conteúdo dele e pede confirmação.

**Imagens sugeridas (foto, Napkin, diagrama)**

- Nova subpasta **`imagens/`** na pasta do projeto, para as cópias dos originais das imagens criadas fora (ChatGPT, Napkin…). Projetos antigos ganham a subpasta ao serem abertos.
- Em cada semana, a prévia traz o painel **«Imagens sugeridas desta semana»**: lista o que ainda falta inserir, com botão para copiar o pedido (ChatGPT) ou o texto (Napkin) e caixa para marcar o que você inseriu de outro jeito. O cartão da semana mostra «📷 N imagem(ns) sugerida(s) a inserir».
- A semana enviada ao ClassAtelier leva essa lista; quando ela volta editada, as figuras já inseridas saem da lista sozinhas.
- Nova função no ClassAuthor: `figure-suggestions.js` (lista, estado e nome do arquivo), com testes. 288 testes passando.

## 1.15.8 · 04/11/2026 · Referências: autor-entidade em minúsculas

- Uma referência como «gartner. Citizen Development…» (entidade em minúsculas) passa a sair «GARTNER. **Citizen Development…**. [ano].»: o autor vai para MAIÚSCULAS e o título seguinte fica em negrito, sem a mensagem «falta o destaque» e sem precisar de uma segunda correção.
- O Manual Class teve as capturas de tela refeitas.

## 1.15.7 · 04/11/2026 · Ficha da disciplina: só o botão corrige as referências

- Na **Ficha da disciplina**, **nada muda sozinho**: as referências deixam de ser corrigidas ao sair do campo e de entrar já ordenadas. A correção (ABNT NBR 6023:2025) e a ordem alfabética só acontecem quando você clica no novo botão **«Organizar lista (corrigir e ordenar)»**, que também mostra, logo abaixo, o que ficou a conferir.
- As referências que a IA escreve para as semanas continuam chegando já no padrão.

## 1.15.6 · 04/11/2026 · Referências conforme a ABNT NBR 6023:2025

O motor de referências passou a seguir a **NBR 6023:2025** (3ª edição, de 21/05/2025), que substitui a de 2018:

- O endereço vem **sem os sinais « < > »**: «Disponível em: https://…. Acesso em: 5 mar. 2026.». Se vierem com os sinais, eles são retirados.
- **Obra sem autor** entra pelo título, com a primeira palavra em maiúsculas e **sem negrito**.
- **Lei, decreto e portaria**: o negrito cobre a denominação inteira, com a data («**Lei nº 14.533, de 11 de janeiro de 2023**»).
- **Matéria de portal ou de jornal**: o negrito vai no nome do portal ou do jornal («Not a Coder?… **The New York Times**, 27 fev. 2025.»); publicação em rede social segue «**Título**. X (Twitter), 2 fev. 2025.».
- Acabou o «[s. d.]»: sem ano aparece «[ano]»; sem local e editora, «[S. l.: s. n.], ano.»; sem só um deles, «[S. l.]: Editora» ou «Local: [s. n.]».
- O prompt de IA (`abntRules`) traz as mesmas regras.

## 1.15.5 · 04/11/2026 · Referências: título sempre em negrito

- O **título sai sempre em negrito**: a mensagem «falta o destaque (negrito) no título» deixou de existir. Com autor, o título é o trecho logo depois dele; sem autor, a obra entra pelo título (negrito e primeira palavra em maiúsculas).
- O que não existe ganha marcador no lugar certo, com a tipografia certa: **«[título]»** em negrito, «[ano]», «Acesso em: [dia mês ano].». Um endereço colado sozinho vira «**[TÍTULO]**, [ano]. Disponível em: <endereço>. Acesso em: [dia mês ano].».

## 1.15.4 · 04/11/2026 · Referências: sem editora, entidade como autor e o que falta à vista

- **Autor entidade** («Gartner.», «Google Cloud.») vai em MAIÚSCULAS; o negrito volta só ao título mesmo em referências **sem editora** («Autor. Título, ano.»), com **ano colado ao título**, com **aspas** no título (reportagem, o jornal fica em negrito) e com **data por extenso** («2 de fevereiro de 2025» vira «2 fev. 2025»; a data de leis fica por extenso).
- O que a norma pede e não dá para deduzir **aparece na própria referência, no lugar certo**: «[ano]» e «Acesso em: [dia mês ano].». A conferência lista o que trocar.

## 1.15.3 · 04/11/2026 · Referências: desfaz negrito fora do título e arruma digitação

- Negrito na **referência inteira**, no autor, na editora ou em vários trechos é desfeito e o negrito volta só ao título.
- Arruma **espaços e pontuação** (espaço antes de ponto ou vírgula, falta de espaço depois de «:» ou «.»), **caixa** (tudo em minúsculas, nome do autor em MAIÚSCULAS, título todo em maiúsculas) e a forma **Autor (ano)**, que vira «Local: Editora, ano».

## 1.15.2 · 04/11/2026 · Referências corrigidas também na ficha e na leitura

- A **Ficha da disciplina** corrige a ABNT das referências ao montar a lista (as suas e as das semanas) e, ao editar uma referência no campo, corrige ao sair dele: negrito no título, autor em SOBRENOME, Nome.
- O motor ABNT corrige também **referência com link** (o link continua no lugar), **autor entidade com órgão e documento online sem editora**, **obra sem autor** (entra pelo título: negrito e primeira palavra em maiúsculas) e **editora com ponto antes do ano**.
- A **leitura da semana** aplica a mesma correção e a ordem alfabética ao mostrar as referências, inclusive nas semanas já salvas antes da correção automática.

## 1.15.1 · 04/11/2026 · Manual com a capa atualizada

- O **Manual Class** mostrava na capa as versões da primeira edição (ClassAuthor 1.3.0, ClassAtelier 1.5.0, ClassAcervo 1.2.0), a data de 30/10/2026 e 105 capturas. A capa agora traz as versões atuais, a data e as 115 capturas de tela. O ClassAuthor em si não mudou.

## 1.15.0 · 04/11/2026 · Referências: o motor acha o título e o autor sozinho

- **Negrito no título sem a IA:** a referência tem ordem fixa (autor. título. edição. local: editora, ano.), então `normalizeAbntCitation` acha o título do livro, a revista do artigo, a obra de um capítulo (depois de «In:»), o título de sites e documentos e o «Lei nº» de leis e normas, e põe o negrito. O subtítulo (depois de «:») fica fora.
- **Autor fora do formato:** «Paulo Freire.», «Silva, Ana.», «Ana Souza e Bia Lima.» viram «FREIRE, Paulo.», «SILVA, Ana.», «SOUZA, Ana; LIMA, Bia.» quando o resto da referência confirma a estrutura; com 4+ autores vira o primeiro com *et al.*
- **Sem adivinhar:** obra sem autor, título solto ou texto sem estrutura clara não são alterados e seguem para a conferência. A correção é idempotente (rodar de novo não muda nada).
- Aplicada a tudo que passa pelo ClassAuthor: referências escritas pelo modelo, lidas do Markdown, enviadas ao ClassAtelier. Novas funções `fixHtmlReference` e `prepareHtmlReferences` (itens HTML do ClassAtelier). Cópias em `public/` atualizadas.

## 1.14.0 · 04/11/2026 · Referências na ABNT NBR 6023 (motor de formatação)

- **Regras novas para a IA** (`abntRules`): nome de pessoa em «SOBRENOME, Nome» (Filho, Neto, Júnior e Sobrinho acompanham o sobrenome), 1 a 3 autores separados por «; », 4 ou mais só o primeiro com *et al.* (sem itálico), entidade por extenso em maiúsculas, negrito só no título principal, nunca no subtítulo, mês abreviado com 3 letras e ponto (maio por extenso) e os modelos de livro, capítulo, artigo e site com «Disponível em: <URL>. Acesso em: …».
- **Motor de formatação** (`src/abnt.js`): `formatAbnt` monta a referência a partir de campos (autor, título, subtítulo, edição, local, editora, ano; capítulo; revista, volume, número, páginas, mês; URL ou DOI e data de acesso); `formatAbntList` entrega a lista ordenada, com uma linha em branco entre as referências e sem marcadores.
- **Correção automática do que é inequívoco** (`normalizeAbntCitation`), aplicada às referências que o modelo escreve e às que chegam do Markdown: 4+ autores viram o primeiro com *et al.*, *et al.* sem itálico, negrito fora do subtítulo, «(org.)» vira «(Org.)», «2ª ed.» vira «2. ed.», 1ª edição omitida, URL entre `< >`, data de acesso «5 mar. 2026».
- **Conferência de forma** (`abntIssues`) ganhou: 4+ autores, *et al.* em itálico, subtítulo em negrito, «(Org.)», edição, URL sem `< >` e data de acesso fora do padrão.
- O roteiro em Markdown, a tela de leitura e a ficha da disciplina passam a mostrar as referências sem marcadores, à esquerda, com uma linha em branco entre elas. O Markdown antigo, com «- », continua sendo lido.
- Cópias em `public/` atualizadas (`abnt.js`, `student-export.js`, `ficha-disciplina.js`).

## 1.13.2 · 04/11/2026 · Manual Class atualizado

- O **Manual Class** descreve o quadro único «Acesso ao ClassAuthor» do ClassAtelier (1.15.1), que serve a busca de legendas, o resumo com IA e as figuras com IA. O servidor em si não mudou.

## 1.13.1 · 04/11/2026 · Manual Class atualizado

- O **Manual Class** descreve os interruptores do bloco Vídeo (faixa de legenda, resumo e transcrição) do ClassAtelier 1.15.0. O ClassAuthor em si não mudou.

## 1.13.0 · 04/11/2026 · Resumo do vídeo com IA (para o ClassAtelier)

- Nova rota **`/api/video-summary`** (despachada por `api/regenerate-week.js`, action `videosummary`, sem criar função nova no plano Hobby). Recebe as falas da legenda com tempo, pede à IA um resumo em seções e tópicos e devolve cada tópico com o instante em que o assunto começa. É o que o botão **Gerar resumo com IA** do ClassAtelier 1.14.0 usa.
- Mesmas regras das outras rotas do ClassAtelier: CORS só para os endereços conhecidos, **código de acesso** ou **chave de IA própria** (nunca a chave do servidor sem o código) e o campo `usage` com o consumo.
- Vídeo longo é dividido em até 4 partes (cerca de 2 horas de fala), uma chamada por parte, para caber no limite de tokens do pedido. Tempos fora do vídeo são descartados e os tópicos saem em ordem de tempo.
- 7 testes novos (`tests/video-summary.test.mjs`); a suíte tem 256 testes.

## 1.12.4 · 04/11/2026 · Manual Class atualizado

- O **Manual Class** descreve a legenda sincronizada do bloco Vídeo (ClassAtelier 1.13.0) e explica a mensagem «O YouTube recusou o pedido automático do servidor». O ClassAuthor em si não mudou.

## 1.12.3 · 03/11/2026 · Busca de legendas: recusa de um cliente não encerra a busca

- Na 1.12.2, se o primeiro modo de acesso respondesse "O YouTube não é mais compatível com este aplicativo ou dispositivo", a busca parava ali e dizia que o vídeo não estava disponível, mesmo com o vídeo no ar. Agora essa resposta, assim como o pedido de login, conta como recusa daquele modo e a busca segue para o próximo (Android, iOS, Android VR, player embutido).
- "Vídeo indisponível" só é mostrado quando todos os modos dizem isso. Se todos recusarem o servidor, a mensagem é "O YouTube recusou o pedido automático do servidor. Cole a transcrição à mão."

## 1.12.2 · 03/11/2026 · Busca de legendas tenta mais de um caminho

- **Buscar legendas do YouTube** passou a tentar quatro "clientes" do YouTube (Android, iOS, Android VR e player embutido) antes de desistir. O YouTube costuma recusar pedidos que vêm de servidores (como o da Vercel) com a mensagem "bloqueou o pedido automático"; outro cliente às vezes é aceito. Vídeo privado ou removido continua parando na primeira resposta.
- **Limite honesto:** se o YouTube recusar o IP da Vercel em todos os caminhos, a mensagem continua e o fallback é colar a transcrição à mão (YouTube → ⋯ → Mostrar transcrição). A chave de API e o código de acesso não influenciam: legendas não usam chave.

## 1.12.1 · 03/11/2026 · Manual Class atualizado

- O **Manual Class** descreve o alinhamento do texto do Parágrafo, novo no ClassAtelier 1.12.0. O ClassAuthor em si não mudou.

## 1.12.0 · 03/11/2026 · Chaves de API próprias (passar o ClassAuthor para outro professor)

- **Sem o código de acesso, o ClassAuthor pede as chaves da própria pessoa.** Na entrada, o código passou a ser opcional: deixando em branco, abre a janela **Chaves de API** (provedor Anthropic ou OpenAI, chave de IA e, se quiser, chave do YouTube). O botão **Minhas chaves**, no cabeçalho, abre a mesma janela a qualquer momento.
- **Regra de uso das chaves do servidor:** com o código certo, valem as chaves do servidor (a pessoa pode preferir a sua); **sem o código, o servidor nunca usa as suas próprias chaves**, nem a de IA nem a do YouTube. Quem traz chave própria usa o modelo padrão do provedor e só o endereço oficial dele.
- **Como a chave é tratada:** fica só na memória da aba (some ao fechar ou recarregar), segue por conexão segura em cabeçalhos `x-aula-ai-key`, `x-aula-ai-provider` e `x-aula-youtube-key`, é usada na hora e **não é guardada nem registrada**. O formato é validado (impede injeção de cabeçalho).
- **Testar chaves:** o botão **Usar estas chaves** primeiro confere cada uma com uma consulta gratuita ao provedor (lista de modelos; 1 unidade de cota no YouTube), sem gastar crédito de IA, e mostra o motivo se recusar. Rota nova `POST /api/test-keys` (ação `testkeys` em `api/regenerate-week.js`, sem nova função na Vercel).
- **Custo em R$ com a chave própria:** o preço do modelo da pessoa entra no cálculo do custo.
- **ClassAtelier:** na figura com IA e nas legendas do YouTube há o campo opcional «Sem o código? Use a sua chave de IA».
- **Botão «Deploy to Vercel»** no README: o outro professor cria a própria cópia, com as próprias chaves, e nada passa pelo servidor do autor.
- Código: `src/user-keys.js`, `src/keys-handler.js`, `public/own-keys.js`; `src/access.js` agora compara o código em tempo constante. Testes: `tests/own-keys.test.mjs`.

## 1.11.1 · 03/11/2026 · Manual Class atualizado

- O **Manual Class** (aberto pelo botão **Manual ↗**) ganhou todos os recursos das versões 1.4.0 a 1.11.0: Mapa de alinhamento, Ficha da disciplina, pacote de entrega com LEIA-ME, custo da IA em reais e cotação do dólar, Rubricas de avaliação (cópia para o Moodle, CSV do Rubric Importer, planilha), Meu estilo de escrita e a rota de legendas do YouTube. Também traz as novidades do ClassAtelier (transcrição e legendas, modo apresentação, fóruns para criar no Moodle) e do ClassAcervo (miniaturas, testar links, relatório para o Moodle).
- Novas capturas de tela (115 no total), rotas e variáveis de servidor novas, limites e problemas comuns atualizados, linha do tempo das versões e sumário com as seções novas.
- O PDF do manual (`manual/manual-class.pdf`) foi refeito com o conteúdo novo.

## 1.11.0 · 03/11/2026 · Meu estilo de escrita (aprender com as suas correções)

- Novo botão **Meu estilo de escrita**. O ClassAuthor compara, frase a frase e sem IA, o texto que ele escreveu com a versão que você corrigiu no ClassAtelier e devolveu («Devolver ao ClassAuthor»): frases **reescritas**, **cortadas** e **acrescentadas**, e as **expressões que você costuma tirar** (ex.: «neste contexto»).
- **Só quando você pedir** («Aprender com as correções marcadas»), 1 chamada curta à IA transforma essas diferenças em **sugestões de regras de estilo** (até 8, em português, sobre estilo e não sobre assunto). Só as diferenças vão para a IA, não a aula inteira.
- As sugestões só valem depois de você **Adotar** (pode editar o texto antes) ou **Descartar**. Você também pode escrever regras à mão, ligar e desligar cada uma e apagar.
- As regras **ligadas** vão em cada redação de semana, num bloco «ESTILO DO PROFESSOR», para a IA evitar os mesmos hábitos. Ficam neste navegador e valem para todos os projetos; **Baixar minhas regras (.json)** e **Importar regras** levam para outro computador.
- Rota nova `POST /api/style` (ação `style` em `api/regenerate-week.js`, sem nova função na Vercel). Código sem rede em `src/style-learning.js` (cópia idêntica em `public/`).
- Testes: `tests/style-learning.test.mjs` e `tests/style-handler.test.mjs`.

## 1.10.0 · 03/11/2026 · Legendas do YouTube para o ClassAtelier

- Nova rota `POST /api/captions` (ação `captions` em `api/regenerate-week.js`, sem nova função na Vercel): recebe o endereço ou o código de um vídeo do YouTube e devolve a transcrição em parágrafos, lida das legendas que o YouTube publica (de preferência as feitas por pessoa, em português; depois as automáticas; depois inglês). Informa idioma, se é automática e quantos parágrafos.
- Sem IA e sem custo. Exige o código de acesso e só responde às origens do ClassAtelier (CORS, como `/api/figure`).
- Erros explicados: vídeo sem legenda, vídeo indisponível, YouTube bloqueou o pedido, falha de rede.
- Testes em `tests/youtube-captions.test.mjs` (rede simulada).

## 1.9.1 · 03/11/2026 · CSV de rubricas no formato exato do plugin do Moodle

### Corrigido
- O **CSV da rubrica** agora segue as regras do importador do Moodle (conferidas com o código do Gerador de Rubricas do INOVALAB): níveis do menor para o maior, textos sem aspas, ponto e vírgula nem vírgulas (trocados por símbolos parecidos), sem BOM, e **a soma dos máximos dos critérios igual à nota máxima** (distribuída em centésimos). O arquivo passa no validador `validar_csv_moodle.php` daquele projeto.
- O app **bloqueia o CSV** quando o Moodle recusaria (pontos repetidos dentro de um critério, por exemplo com nota máxima muito pequena) e diz o motivo; critério com peso 0 fica de fora com aviso; nomes iguais ganham « (2)».

### Novo
- A IA devolve também um **resumo do que entendeu da atividade**, mostrado na rubrica para você conferir. O pedido à IA ganhou os princípios do Gerador de Rubricas: derivar os critérios do que foi pedido, respeitar critérios já informados e descrever o que o estudante fez, em linguagem de avaliação formativa.

## 1.9.0 · 03/11/2026 · Rubricas de avaliação

### Novo
- **Rubricas de avaliação** (botão na coluna «Ações do projeto»): você escolhe quais atividades e práticas recebem rubrica e pede. **Nada é criado automaticamente.** Cada rubrica usa 1 chamada à IA (o custo aparece no contador em R$).
- Você define o **número de critérios** (3 a 6) e a **nota máxima** (use a mesma na tarefa do Moodle). Com uma atividade marcada, pode colar o **enunciado exato** que os estudantes receberam, e a rubrica avalia só o que ele pede. Há também um campo de pedido livre à IA e o botão «Refazer».
- Cada rubrica tem critérios com **peso (%)** e **4 níveis** (Excelente, Bom, Regular, Insuficiente). A pontuação de cada nível é calculada do peso e da nota máxima, e muda na hora quando você edita os pesos. Tudo é editável na tabela; avisos mostram pesos que não somam 100% e níveis sem descrição.
- **Copiar para o Moodle**: o editor de rubrica do Moodle não recebe tabela colada, então cada critério, texto de nível e pontuação tem um botão «Copiar», na ordem do editor (do menor para o maior desempenho). Também copia a **tabela formatada** (para descrição de tarefa, página, fórum e Word), o **texto** e uma versão para **planilha**.
- **CSV para o Moodle** no formato do plugin «Rubric Importer» (o Moodle sem plugin não importa rubrica de arquivo): um arquivo por rubrica, com a pontuação por nível. Mais **planilha (.xlsx)** com uma aba por rubrica.
- As rubricas entram no **Material de Mediação (PDF)** e no **pacote completo (ZIP)** (`moodle/rubricas/*.csv`, `professor/rubricas.xlsx`), e o LEIA-ME aponta pendências nelas. Ficam salvas com o projeto.
- Ideias do Gerador de Rubricas do INOVALAB: nota máxima igual à da tarefa, enunciado exato como base e aviso sobre o plugin do Moodle.

## 1.8.0 · 03/11/2026 · Cotação do dólar automática

### Novo
- **Cotação automática**: o servidor busca o dólar na internet (AwesomeAPI; se falhar, open.er-api.com), guarda por 6 horas e usa nas contas em reais. Sem internet, usa a referência de R$ 5,49 (03/11/2026).
- **Campo «Cotação do dólar (R$)» na janela de estimativa**: digite o valor do dia para trocar a cotação neste navegador; apague para voltar à automática. O custo do projeto na coluna «Ações do projeto» também passa a usar esse valor.
- Ordem de prioridade: valor digitado no app > `AI_USD_BRL` fixado no servidor > cotação automática > referência. `AI_USD_BRL_AUTO=false` desliga a busca automática.

## 1.7.0 · 03/11/2026 · Controle de custo da IA

### Novo
- **Estimativa antes de gerar**: ao clicar em «Gerar com IA», uma janela mostra quantas chamadas à IA, quantos tokens e **quanto deve custar, em reais (R$)**, em faixa (mínimo a máximo, com o valor provável). No modo «aprovar cada aula antes de gerar a próxima», mostra a rodada de uma aula e também o total da disciplina. Há «Cancelar» e a opção «Não mostrar de novo».
- **Custo real**: o servidor mede o que cada chamada consumiu e o ClassAuthor soma por projeto. A coluna «Ações do projeto» mostra «IA neste projeto: ≈ R$ …» e, ao fim da geração, o aviso informa o custo daquela geração. O total fica salvo com o projeto.
- **A estimativa aprende**: depois de cada geração, o consumo médio por semana é guardado neste navegador e usado nas próximas estimativas (faixa mais estreita).
- **Preços e dólar**: referência do Claude Sonnet 5.5 (US$ 2 por milhão de tokens de entrada e US$ 10 de saída) e dólar de referência a R$ 5,49 (03/11/2026). Troque com `AI_PRICE_INPUT_USD`, `AI_PRICE_OUTPUT_USD` e `AI_USD_BRL` no servidor. Modelo sem preço conhecido mostra só chamadas e tokens.
- Todos os valores são **aproximados**: quem cobra é o provedor da IA.

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
