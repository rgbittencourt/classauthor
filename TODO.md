# Redesenho estrutural do ClassAuthor — versão de teste

## Interface e jornada
- [x] Nova tela de entrada centrada no percurso de autoria, com navegação principal **Planejar → Revisar → Exportar → Importar** no workspace, preservando autoria, instituição, acesso, marcas e créditos existentes.
- [x] O redesenho deve ser estruturalmente mais ousado, com mudanças visíveis de hierarquia, composição e navegação; não pode se limitar a trocar a paleta de cores. Usar como referência os padrões de navegação e percurso por etapas do AcademiaOS, sem alterar o AcademiaOS.
- [x] Interface responsiva e prévia navegável para teste antes do veredito do usuário, com progresso e estados vazios honestos, sem dados ou resultados simulados como reais.
- [x] Quebrar mais a etapa PLANEJAR em 13 passos menores: curso e turma, contexto de ensino, tempo e calendário, objetivos e conteúdos, abordagem e metodologias, perfil acadêmico, práticas e laboratório, recursos e leituras, composição ClassAtelier, materiais de apoio, referências e vídeos, imagens e diagramas, conferir e gerar. Permitir revisitar qualquer passo e abrir o briefing completo, sem perda de campos, opções ou dados.
- [x] TEM QUE TER A BARRA INFERIOR COM OS CRÉDITOS: mostrar no workspace os créditos de desenvolvimento de Prof. Rogério Bittencourt, INOVALAB e IFSC, com identificação e marcas institucionais, incluindo Planejar, Revisar e Exportar. A barra deve permanecer visível sem cobrir controles, inclusive no celular; preservar os créditos completos da capa.
- [x] As quatro etapas ficam no contexto de **Planejar**, como lista vertical sob demanda e não na horizontal. A lista inicia fechada mesmo quando Planejar é a área ativa; só abre quando Planejar é clicado e fecha ao clicar fora ou em Revisar, Exportar ou Importar. Cliques nos campos, nos passos laterais, nas ferramentas e mudanças de disponibilidade dos resultados não a abrem nem reabrem. Manter os nomes aprovados: **O curso**, **Escolhas pedagógicas**, **Materiais da aula** e **Conferir e gerar**, preservando acesso aos 13 passos e ao briefing completo.
- [x] Incluir **Importar** como quarta e última área da navegação principal. Expor nela as ações originais **Restaurar backup** e **Abrir semana salva**, preservando os nós, IDs e handlers existentes.
- [x] Deixar as ferramentas existentes fáceis de localizar: Mapa de Alinhamento e Rubricas de Avaliação em Revisar; Plano de Ensino em Exportar; Preencher vazios com IA no passo Objetivos e conteúdos, dentro de Escolhas pedagógicas. Renomear o rótulo visível da Ficha da Disciplina para Plano de Ensino, sem mudar ID, handler, estrutura ou compatibilidade dos arquivos.

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
A versão atual parte da árvore restaurada `d473a7fa1a0b343835c0494965351184236b2210`. As quatro subetapas estão numa lista vertical sob demanda, fechada por padrão; os quatro nomes completos continuam disponíveis, e a navegação principal segue Planejar → Revisar → Exportar → Importar. As ações originais de restaurar backup e abrir aula salva preservam seus nós e handlers. Nove regressões focadas passaram; a suíte completa passou em 345/345, assim como sintaxe e `git diff --check`. Capturas desktop e celular confirmaram o menu aberto/fechado, os créditos do rodapé e as áreas Revisar/Exportar/Importar sem reabertura; cliques reais no navegador confirmaram abertura por Planejar, fechamento pela navegação lateral e por clique fora, e ocultação nas três outras áreas. O salvamento na branch de teste e o checkpoint interno ainda serão concluídos; publicação automática permanece desativada e nada foi publicado.
