# Redesenho estrutural do ClassAuthor — versão de teste

## Interface e jornada
- [x] Nova tela de entrada centrada no percurso **Planejar → Revisar → Exportar**, preservando autoria, instituição, acesso, marcas e créditos existentes.
- [x] O redesenho deve ser estruturalmente mais ousado, com mudanças visíveis de hierarquia, composição e navegação; não pode se limitar a trocar a paleta de cores. Usar como referência os padrões de navegação e percurso por etapas do AcademiaOS, sem alterar o AcademiaOS.
- [x] Interface responsiva e prévia navegável para teste antes do veredito do usuário, com progresso e estados vazios honestos, sem dados ou resultados simulados como reais.
- [x] Quebrar mais a etapa PLANEJAR em 13 passos menores: curso e turma, contexto de ensino, tempo e calendário, objetivos e conteúdos, abordagem e metodologias, perfil acadêmico, práticas e laboratório, recursos e leituras, composição ClassAtelier, materiais de apoio, referências e vídeos, imagens e diagramas, conferir e gerar. Permitir revisitar qualquer passo e abrir o briefing completo, sem perda de campos, opções ou dados.
- [x] TEM QUE TER A BARRA INFERIOR COM OS CRÉDITOS: mostrar no workspace os créditos de desenvolvimento de Prof. Rogério Bittencourt, INOVALAB e IFSC, com identificação e marcas institucionais, incluindo Planejar, Revisar e Exportar. A barra deve permanecer visível sem cobrir controles, inclusive no celular; preservar os créditos completos da capa.

## Refinamento sobre a base restaurada b3f1ff9
- [x] Não perder os textos/nome de etapas: **O curso**, **Escolhas pedagógicas**, **Materiais da aula** e **Conferir e gerar** permanecem escritos por extenso, no desenho da base restaurada; não substituí-los por bolinhas/ícones nem apenas tooltip.
- [x] Mapa de Alinhamento e Rubricas de Avaliação ficam explícitos em Revisar, com os mesmos controles e handlers originais; suas condições de disponibilidade não mudam.
- [x] Ficha da Disciplina passa a se chamar **Plano de Ensino**, localizável em Exportar, preservando ID, handler e compatibilidade dos arquivos.
- [x] **Preencher vazios com IA** permanece em Planejar → Escolhas pedagógicas → Objetivos e conteúdos (passo 04), mantém esse nome mesmo sem configuração de IA e indica Minhas chaves para habilitação; navegação nunca inicia IA.

## Workspace e recursos existentes
- [x] Workspace com navegação de produto à esquerda, área central dedicada à tarefa atual e resumo factual do curso à direita, substituindo a hierarquia visual anterior em vez de apenas mudar a paleta.
- [x] Preservação integral dos campos e opções atuais de planejamento pedagógico, com navegação clara entre suas sete áreas e sem perda de configurações.
- [x] Manutenção dos controles de composição das aulas para o ClassAtelier, incluindo mídia e componentes interativos já suportados.
- [x] Preservação dos fluxos existentes de geração com IA, revisão humana, ajustes pontuais, aprovação por aula e retomada do planejamento.
- [x] Manutenção das práticas e laboratórios, materiais de apoio, recursos e leituras já disponíveis no app.
- [x] Preservação da produção audiovisual existente e de seus roteiros, slides, narração e planilha de produção.
- [x] Manutenção das exportações e ferramentas docentes existentes; vídeos do YouTube devem continuar saindo como blocos nativos de vídeo no ClassAtelier, com eliminação de vídeos e links de artigos repetidos.
- [x] Preservação de backup, restauração, pasta do projeto, abertura de aulas salvas e configuração de chaves próprias, sem expor credenciais.

## Isolamento e entrega
- [x] As alterações oficiais ficam exclusivamente na branch de teste `test/classauthor-ui-export-fixes`; não fazer merge, publicação nem alteração em `main` ou no site principal.
- [ ] A prévia disponibilizada pelo projeto de teste permanece separada do site principal; o veredito final só vem depois que o usuário puder testar e dar retorno.

## Estado da prévia
A estrutura foi capturada em desktop e celular. A navegação pelos 13 passos do Planejar e o acesso de cada um a seus campos foram verificados; os campos originais permanecem únicos, sem IDs duplicados, e o modo sem IA mantém a geração desabilitada. Os créditos de desenvolvimento e institucionais ficam no rodapé persistente, com separação de 1 px do workspace no desktop e botão de gerar livre no celular. As vistas de Revisar/Exportar, recuperação e validação de título sem chamada à IA continuam preservadas. A suíte passou (336/336); os dois logotipos retornaram HTTP 200. A prévia aguarda teste do usuário e retorno antes de qualquer veredito final.

### Conferência do refinamento atual
As três vistas foram capturadas com o HTML e os handlers reais, em perfil fictício sem IA: Objetivos e conteúdos mostra os quatro nomes de etapa e o botão Preencher vazios com IA; Revisar mostra Mapa de Alinhamento e Rubricas de Avaliação; Exportar mostra Plano de Ensino. O rótulo do preenchimento permanece mesmo sem configuração, mas o botão continua desabilitado. O CSS e o módulo de grupos são idênticos à base b3f1ff9 escolhida pelo usuário. A suíte final passou em **340/340 testes**, tanto na prévia quanto no checkout externo, incluindo quatro regressões novas que cobrem nomes visíveis, identidade/handlers dos controles e navegação sem IA. Sintaxe e `git diff --check` passaram. Não foi feita geração paga, importação de arquivos reais nem publicação; o veredito do usuário continua pendente.
