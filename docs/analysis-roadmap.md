# Roadmap da Análise de Repositórios

> Documento vivo. Ele é atualizado a cada etapa (ou parte de etapa) concluída.
> Status: `[ ]` pendente · `[~]` em andamento · `[x]` concluído.
> O histórico de mudanças fica em [Registro](#registro) no fim do arquivo.

## Objetivo

Hoje a análise responde **"o que é esse repositório?"**, resumindo o README e a árvore de pastas.
No fim deste plano ela deve responder **"o que essa pessoa comprovadamente sabe fazer?"**. Cada afirmação
vai apontar para o arquivo, as linhas ou o commit que a prova.

### Princípios

1. **Evidência ou nada.** Toda afirmação da análise precisa citar `arquivo + linhas` (ou um commit), e o código
   verifica a citação. Se não der para verificar, a afirmação é descartada.
2. **Regras viram código, não prompt.** O que hoje está em 400 linhas de "NEVER/MUST" passa a ser validação
   determinística. Os prompts ficam curtos.
3. **Fatos baratos antes de tokens caros.** Tudo o que dá para medir sem LLM (grafo de imports, churn, autoria,
   testes) é medido antes, e o LLM interpreta esses fatos.
4. **Decisões guiadas pelo eval.** Troca de modelo ou de prompt só entra se o `pnpm eval` mostrar melhora.
5. **A privacidade atual é mantida.** Código de repositório privado só vai para um LLM externo com opt-in explícito e
   para um provedor que não treina com os dados.

### Onde queremos chegar

- **Página do projeto** com notas por eixo (Arquitetura, Segurança, Testes, Documentação, DevOps) e a seção
  *"O que @usuario fez"*, com habilidades demonstradas e links permanentes para o código.
- **Perfil** com "Habilidades comprovadas", atualizadas automaticamente e com a quantidade de evidências.
- **Busca semântica** (pgvector): "quem já implementou fila com retry?", com resultados que trazem a prova.
- **Projetos em equipe:** cada membro tem a própria contribuição analisada.
- **Análise viva:** reanálise incremental a cada push, com uma linha do tempo da evolução.
- **Eval no CI**, medindo qualidade e custo de cada mudança.

---

## Fase 0: Arrumar a base ✅

Corrigir o que distorce os dados hoje e criar a ferramenta de medição.

- [x] **0.1 Classificador de propósito.** Comparar palavras inteiras em vez de substrings (`"tp"` casava com
      `"http"`, então quase todo README virava "learning"). Remover tokens ambíguos (`tp`, `t1`, `t2`). Escrever testes.
- [x] **0.2 Falha de análise não apaga o projeto.** Marcar `ERROR` e manter o projeto. O usuário pode tentar de
      novo depois do cooldown.
- [x] **0.3 Métricas de contribuição corretas** (`services/worker/user-worker.ts`):
  - [x] mesmo escopo de `git log` para commits e linhas (hoje um usa `--all` e o outro não);
  - [x] ignorar lockfiles, `dist`/`build`, vendor, minificados e arquivos gerados na contagem de linhas;
  - [x] ignorar merge commits;
  - [x] `activeDays` do perfil como dias **distintos** entre projetos (hoje é somado e conta o mesmo dia várias vezes).
- [x] **0.4 Webhook de push confiável.** Hoje ele credita todos os commits do push ao dono da instalação, conta
      qualquer branch (o merge conta de novo) e só incrementa contadores (reenvio duplica, erro nunca se corrige).
      A mudança: o webhook só agenda um **recálculo** (idempotente e com debounce) a partir do `git log` da branch
      padrão, filtrando pelo autor. O recálculo é idempotente, então não precisa de tabela de deduplicação.
- [x] **0.5 Projetos em equipe (opção A: colaboradores no mesmo projeto).** Trocar o `@unique` do
      `Repository.githubId` não resolvia: as instalações do GitHub App são por conta, então um colega nem consegue
      listar um repo que não é dele. Implementado:
  - [x] modelo `ProjectCollaborator` (convite `PENDING` → `ACCEPTED`; recusar ou sair apaga a linha), limite de 10
    por projeto, notificações `PROJECT_INVITE` e `PROJECT_INVITE_ACCEPTED`;
  - [x] o `user-worker` calcula as estatísticas de **cada membro** a partir do mesmo `git log`, e cada commit é
    creditado a no máximo um membro (email exato primeiro; nome só se for único; ambíguo não conta para ninguém);
  - [x] painel do projeto com a seção "Equipe" (contribuição de cada membro, convite com busca de usuários,
    convites pendentes, remover/sair, aceitar/recusar) e aceite direto pelo sino de notificações;
  - [x] projetos privados acessíveis para membros e convidados;
  - [x] projetos em que a pessoa colabora aparecem no perfil dela, com o dono real e o selo "Colaboração".
  Detalhes em [project-collaborators.md](project-collaborators.md).
- [x] **0.6 Abstração de provedor de LLM.** Criar a interface `LlmProvider` (o Groq vira uma implementação). Remover
      `project-overview.ts`, que é código morto.
- [x] **0.7 Conjunto de avaliação (`pnpm eval`).**
  - [x] estrutura `services/worker/evals/` com casos travados por SHA e um runner que usa o mesmo `pipeline.ts` da produção;
  - [x] métricas: JSON válido, fatos esperados (heurística + regex no texto do LLM), afirmações proibidas, tokens e latência;
  - [x] 20–30 casos reais: **22 casos**. 7 repos do time (trabalhos de faculdade, homelab, jogo Godot, SO, curso de Node, o próprio Retold e um fork grande) e 15 open source (Spring, Django, React, notebooks, READMEs em PT-BR, material didático). Veja `services/worker/evals/README.md`.

**Pronto quando:** o classificador tem testes, nenhum projeto é apagado por falha, as métricas de commit batem com o
`git log` filtrado, e o `pnpm eval` roda localmente.

### Linha de base (2026-11-05, antes da Fase 1)

| Modo | Resultado | Observações |
|---|---|---|
| Heurísticas (`pnpm eval`, 22 casos) | **61/76** checks | **A detecção de projeto de estudo é a heurística mais fraca:** de 9 projetos realmente de aprendizado, só 1 é reconhecido (`lucasOS` diz "learning project" no README e mesmo assim sai como `demo`). Sem README (`lumia`, `GETAPET`, `light-devil`), o propósito acadêmico é invisível. Outras falhas: GDScript não é reconhecido; `vllm` vira `research` (por citar arXiv) e domínio `web`; notebooks viram domínio `web`; `cobra` vira `systems`; `is` fica com domínio `unknown`; `lumia` (AdonisJS + Edge) vira `Frontend`; o `spring-petclinic` (app de exemplo) vira `production`. |
| LLM (`pnpm eval --llm`, `groq/openai/gpt-oss-120b`, 22 casos) | **80/94** checks, 5 casos com erro | Os 5 erros (`ripgrep`, `web-dev-for-beginners`, `retold`, `vllm`, `tabnews`) são `413 Request too large`: o prompt passa do limite de **8.000 tokens/min do free tier**. **23% dos repos ficam no limite ou acima.** ~~A causa é README grande~~ (errado: o README já é cortado em 4.000 caracteres, ~1K tokens). Medido depois: ~3,5K tokens são **instruções fixas do prompt**, e a lista de pastas de repos grandes soma até 2,5K. O Groq ainda reserva o `max_completion_tokens` dentro do limite (com 2.500, "Requested" = entrada + 2.500). Nas checagens de texto, o LLM não percebe o `node_modules` commitado no `GETAPET` (o scan ignora a pasta, então ele nunca vê) e não cita Godot no `light-devil`. Cerca de 70K tokens de entrada e 43K de saída nos 17 casos que rodaram (média de ~4K/~2,5K). |

### Achados durante a Fase 0 (fora do plano original)

- **O modelo de produção não existe mais:** o `llama-3.3-70b-versatile` foi removido do Groq (`404 model_not_found`).
  Se a produção usa o mesmo modelo, **toda análise está falhando**, e até essa branch cada falha apagava o projeto.
  O padrão agora é `openai/gpt-oss-120b` (Groq), com override via `LLM_MODEL`.
- **Rate limit do Groq nunca era detectado** (o erro era embrulhado), e `586ms` virava 586 minutos de espera.
- **"Request too large" era tratado como rate limit**, o que reagendaria a análise para sempre. Agora vira erro definitivo.
- **O clone era `--depth=50`**, então as estatísticas de contribuição só viam os últimos 50 commits.
- **Separador de caminho no Windows:** a detecção de CI (e outras) falhava em máquinas Windows por causa do `\`;
  agora o `relativePath` é sempre POSIX. Em produção (Linux) já funcionava.
- **Tag "Unknown":** projetos sem linguagem detectada ganhavam a tag "Unknown" (comparação sem normalizar maiúsculas).
- **Limite do free tier vs. tamanho do prompt:** o prompt atual já passa de 8K tokens com READMEs grandes. Isso reforça
  a Fase 2 (orçamento de tokens por chamada) e, no free tier, a necessidade de cortar o README de forma mais agressiva.

### Pendências da Fase 0

- [x] Decisão da 0.5: opção A (colaboradores).
- [x] Completar os casos do eval (22).
- [x] ~~Confirmar qual modelo a produção usa~~: não há produção no ar. Com a chave nova do Groq, o
      `llama-3.3-70b-versatile` continua `404`, então foi removido de fato; o limite segue em 8.000 tokens/min.
- [ ] **Limite de 8K tokens/min do free tier** (23% dos repos do eval no limite ou acima). Cortar o README **não**
      resolve (ele já é ~1K tokens). O que resolve é encolher a entrada: o prompt de ~400 linhas (~3,5K tokens fixos) e
      a lista de pastas em 6 níveis. Isso é exatamente a Fase 2 (prompts curtos, mapa do repo compacto da Fase 1 no
      lugar da árvore de pastas, orçamento de tokens). Alternativa imediata: Developer tier do Groq.
- [x] Suíte completa verificada com o Redis do Retold: 134 unitários, 31 de integração e 13 e2e (incluindo um e2e
      novo do fluxo de equipe com duas sessões de navegador).

## Fase 1: Entender o repo sem LLM ✅

Código em `services/worker/analyze/repo-map/`. O resultado (`RepoMap`) é persistido em
`RepositoryAnalysis.repoMap` (migration `20261105180000`). Ele **não** entra no prompt atual, que já está no limite
do free tier; a Fase 2 é que decide o que o LLM lê a partir dele.

- [x] **Grafo de imports e centralidade.** Decisão: extração por regex por linguagem (TS/JS, Python, Go, Java/Kotlin,
      C/C++, Rust, Ruby, GDScript), sem compilador do TypeScript nem tree-sitter, para não ter dependência nativa e
      continuar rápido (vLLM, com 3,3K arquivos no grafo, leva ~4s). A resolução entende aliases do tsconfig, pacotes de
      workspace, `go.mod`, classes JVM, `-Iinclude` em C e `crate/self/super` em Rust. A importância é medida por PageRank.
- [x] **Churn** nos últimos 50 commits (`--no-renames`; com detecção de renomeação, um repo de traduções levava 68s, e
      agora leva 0,15s) e **código gerado** (marcadores `@generated`/"DO NOT EDIT", arquivos minificados, lockfiles e build).
- [x] **Módulos:** workspaces declarados (npm/pnpm/lerna/Cargo/go.work), depois pastas convencionais (`apps/*`,
      `packages/*`, `crates/*`...), depois pastas de topo. Layout Maven (`src/main`, `src/test`) não vira módulo.
- [x] **Fatos por módulo:** arquivos, fontes, testes, LOC, linguagens, arquivos-chave (mais centrais), dependências
      externas e de quais outros módulos depende.
      *Complexidade aproximada:* não feita. Sem LLM ela agrega pouco; volta se a Fase 2 mostrar necessidade.
- [x] **Mapa persistido** no banco.
- [x] **Maturidade medida** (0–100, com evidência por sinal): testes e proporção, CI que **roda** testes, lint (inclusive
      configurado em `pyproject`, pre-commit, rustfmt, golangci...), tipagem, container, documentação, histórico e higiene.
- [x] **Higiene** (o que está commitado e não deveria): `node_modules`, venv, `__pycache__`, artefatos compilados,
      `.env`, chaves privadas e arquivos grandes, lidos do `git ls-files` (o scan ignora `node_modules`, então não via).
      Fixtures de teste (`tests/.../.env`) não contam.
- [x] **Classificação com fatos, não só com palavras-chave:**
  - domínio "biblioteca" quando o manifesto da raiz descreve um pacote publicável (npm sem `private` e com entry
    point, módulo Go sem `package main`, crate só com lib, pacote Python que não é site Django);
  - citar arXiv não torna "research" um projeto com CI/Docker;
  - repositórios dominados por notebooks são "data";
  - alguns HTML soltos (docs, templates) não tornam um repo "web";
  - frases de aprendizado ("learning project", "for educational purposes", título com "Curriculum"/"Handbook",
    "24 lessons") e de demo ("Sample Application" no título ou na introdução);
  - backends que faltavam no tipo de app (AdonisJS, FastAPI, Django, Spring, Gin...): o lumia deixou de ser "Frontend".
- [x] **Lacunas corrigidas:** README `.rst/.txt/.adoc` não era lido (afetava também o que ia para o LLM); GDScript e
      Godot não eram reconhecidos; notebooks não contavam como Python.

### Linha de base depois da Fase 1

| Modo | Antes | Depois |
|---|---|---|
| Heurísticas (`pnpm eval`) | 61/76 | **107/110** (inclui 34 checks novos do mapa: módulos, arquivos centrais, higiene, maturidade) |

As 3 falhas restantes são trabalhos de faculdade **sem README** (`lumia`, `light-devil`, `GETAPET`): nada no código diz
"isto é trabalho de faculdade". **Recomendação de produto:** perguntar na criação do projeto "Que tipo de projeto é este?"
(acadêmico / estudo / pessoal / profissional). É barato, exato, e o usuário sabe a resposta melhor que qualquer
heurística ou LLM.

**Risco de sobreajuste:** algumas regras novas foram motivadas por casos do eval (títulos "Curriculum"/"Handbook",
"N lessons"). São regras gerais, mas o único jeito de controlar o risco é continuar adicionando casos que **não** foram
usados para escrever as regras.

### Achados da Fase 1

- **Checks de texto do LLM são instáveis numa execução só:** o mesmo caso (`flask`) falhou e depois passou sem nenhuma
  mudança relevante. Na Fase 2, rodar cada caso N vezes e olhar a taxa, não um resultado único. O relatório JSON do eval
  agora guarda a resposta do LLM (`llmOutput`) para investigar falhas.
- O eval passou a baixar os repos com 50 commits (como o clone da produção), para churn e histórico serem comparáveis.

## Fase 2: Análise em duas etapas com evidência verificada (3 semanas)

> **Ajuste de orçamento (2026-11-05):** o plano original previa chamadas de até 100K tokens (modelo pago). O
> desenvolvimento roda no free tier do Groq (`gpt-oss-120b`: 8K tokens/min, contando o `max_completion_tokens`, e
> o raciocínio do modelo conta como saída). Por isso o orçamento por chamada é **configurável por env** e o padrão
> cabe no free tier: entrada ~4,5K + saída ~2K por chamada, no máximo 3 chamadas de map e 1 de reduce, com um
> limitador de tokens/min que espera em vez de estourar. Com um modelo pago, basta subir os limites.

- [x] **Orçamento de tokens:** estimativa de tokens, limitador por minuto (`LLM_TOKENS_PER_MINUTE`), espera curta
      em rate limit dentro da própria análise (sem reagendar tudo), `reasoning_effort` baixo no `gpt-oss`.
- [x] **Map:** unidades montadas a partir do repo map (módulos ordenados pela centralidade dos arquivos). Cada
      chamada recebe os arquivos centrais da unidade **com número de linha**, sanitizados, dentro do orçamento. A saída
      é JSON com afirmações (responsabilidade, padrão, implementação notável, risco), cada uma com
      `{file, startLine, endLine, symbol}`.
- [x] **Validador (determinístico):** o arquivo precisa ter sido enviado, as linhas precisam existir e o `symbol`
      citado precisa aparecer no trecho. Se o símbolo estiver em outra parte do arquivo, a citação é reancorada;
      se não aparecer no arquivo, a afirmação é descartada.
- [x] **Checagem (adicionada durante a fase):** o validador prova *onde* a afirmação aponta, não que ela é
      *verdadeira*. No eval, o map acusou "senha armazenada antes do hash" num código do flask que chama
      `generate_password_hash`. Uma chamada curta em lote mostra só as linhas citadas e pergunta se elas comprovam
      cada afirmação (riscos primeiro). Refutadas saem; riscos que não couberam na checagem também saem.
- [x] **Reduce:** recebe fatos medidos (stack, classificação, repo map, maturidade) + afirmações verificadas, e
      devolve resumo, arquitetura, pontos fortes e sugestões que **referenciam as afirmações por id**. Referência
      inexistente é removida.
- [x] **Notas por eixo:** Testes, DevOps e Documentação vêm da maturidade medida (sem LLM). Arquitetura e
      Segurança vêm do reduce e só valem com pelo menos uma afirmação verificada.
- [x] Saída estruturada validada com zod. Prompts curtos (as regras viram código).
- [x] Novos modelos: `AnalysisRun` (versão do pipeline, modelo, commit, tokens, chamadas, status), `AnalysisClaim`,
      `ProjectScore`.
- [x] Manter os modos de privacidade de `privacy.ts`: projeto privado não envia código, então pula o map e o reduce
      trabalha só com metadados.
- [x] `llmOverview` continua compatível com a UI atual; pontos fortes e sugestões ganham links para o GitHub
      (SHA + linhas).
- [x] Eval: `--repeat N`, taxa de afirmações verificadas, tokens por análise.

## Fase 3: "O que essa pessoa fez" (3 semanas)

- [ ] Autoria: `git blame` + diffs do usuário, gerando a % de cada módulo que é dele.
- [ ] Análise dos commits mais relevantes do usuário, gerando as habilidades demonstradas.
- [ ] Taxonomia fixa de habilidades (100–150), com nível *usou / implementou / projetou* decidido pelas evidências.
- [ ] Agregação das habilidades no perfil, entre projetos.
- [ ] Aposentar o `impactScore` atual (`(adicionadas − removidas) × 0.01 + commits` pune refatoração).
- [ ] Cada membro de um projeto em equipe recebe a própria análise. A base existe desde a 0.5: os membros e as
      estatísticas por membro; falta a análise qualitativa do que cada um fez.

## Fase 4: Levar para o produto (3 semanas)

- [ ] Página do projeto com as abas Visão geral / Arquitetura / Evidências / O que @usuario fez, e links permanentes para o GitHub (SHA + linhas).
- [ ] Perfil: "Habilidades comprovadas".
- [ ] Embeddings (pgvector) de afirmações e habilidades, com busca semântica para recrutadores.
- [ ] Feed: "projetos parecidos", filtro por habilidade, peso leve de qualidade no ranking.
- [ ] Notas por eixo sempre públicas; o dono decide se os pontos fracos aparecem para todos.

## Fase 5: Análise viva e custo sob controle (2 semanas)

- [ ] Reanálise incremental no push (debounce de 1x/dia por repo, cache por hash de conteúdo).
- [ ] Linha do tempo de evolução no perfil.
- [ ] Registro de tokens e custo por execução; orçamento por usuário; Batch API para reanálises.
- [ ] Botão "essa afirmação está errada", que alimenta o conjunto de avaliação.

---

## Modelos de LLM

A escolha final é do eval (Fase 0.7), rodando os mesmos casos em 2–3 modelos.

| Uso | Ponto de partida | Observação |
|---|---|---|
| Map (volume) | Claude Haiku 5.5 | Cerca de US$0,10/US$0,50 por milhão de tokens abaixo de 100K por prompt; manter chamadas < 100K |
| Reduce (1 por projeto) | Haiku 5.5; Sonnet 5.5 se o eval justificar | Sonnet custa cerca de US$2/US$10 por milhão de tokens |
| Reanálises | Batch API | 50% de desconto |
| Embeddings | Modelo open source pequeno no worker | Custo zero |
| Desenvolvimento / eval | Free tier (Groq/Gemini) **só com repos públicos** | No free tier do Gemini os dados podem ser usados para treino |

O free tier do Groq para o Llama 3.3 70B tem cerca de 100K tokens por dia, o que não comporta o pipeline novo
(cerca de 150K tokens por análise). Estimativa de custo: US$0,02–0,09 por análise. Confirme os preços nas páginas
oficiais antes de decidir.

---

## Registro

| Data | Etapa | O que mudou |
|---|---|---|
| 2026-11-05 | — | Plano criado. Branch `feat/analysis-phase-0`. |
| 2026-11-05 | 0.1 | Classificador com tokens e frases inteiras; README exige frase acadêmica ou 2 palavras; nomes de repo e pastas por token. 27 testes em `apps/web/src/tests/worker-classify-project.spec.ts`. |
| 2026-11-05 | 0.2 | Falha final marca `ERROR` e devolve a cota numa transação atômica (`services/worker/analysis-failure.ts`); tentativas intermediárias do BullMQ não mexem em nada. Sem cooldown de 1h na conta. Removido o caminho `PROJECT_INTERNAL_ERROR` do `get-project-analysis`. Teste de integração em `worker-analysis-failure.integration.spec.ts`. |
| 2026-11-05 | 0.3 | Descoberto e corrigido: o clone era `--depth=50`, então as estatísticas só viam os últimos 50 commits. O `user-worker` agora usa clone `history` (bare, histórico completo da branch padrão) e um único `git log --no-merges --numstat` (`services/worker/contribution-stats.ts`). Exclui lockfiles, build, vendor e gerados. Nova coluna `UserProjectStats.activeDates` (migration `20261105120000`) e dias distintos no perfil. 19 testes, incluindo um repo git real. |
| 2026-11-05 | 0.4 | O webhook agora só agenda recálculos (`apps/web/src/domains/github/push-webhook.service.ts`): apenas branch padrão, todos os usuários vinculados ao repo, debounce de 5 min via deduplicação do BullMQ (verificado no Redis local). Removido o `webhook.repository.ts`. Doc `github-webhooks.md` reescrita (o path estava errado). Projetos privados seguem fora das estatísticas, como no `user-worker`. |
| 2026-11-05 | 0.5 | Investigado: a troca do `@unique` não basta (instalações do GitHub App são por conta). Opções A/B/C registradas; aguardando decisão. |
| 2026-11-05 | 0.6 | Interface `LlmProvider` + `GroqProvider` + `createLlmProvider()` (`LLM_PROVIDER`/`LLM_MODEL`) em `services/worker/llm/`. Corrigidos dois bugs: o rate limit do Groq nunca era detectado (o erro era embrulhado como falha genérica, então o projeto era apagado) e `586ms` virava 586 minutos de bloqueio. Agora o erro é tipado (`LlmRateLimitError`) e usa o header `retry-after`. Uma falha na 1ª chamada ainda tenta a 2ª. Tokens de uso nos logs. Removidos `groq-client.ts` e `project-overview.ts`. 17 testes. |
| 2026-11-05 | 0.7 | Eval criado: `pnpm eval` (heurísticas) e `pnpm eval --llm`. Pipeline extraído para `services/worker/pipeline.ts` (worker e eval usam o mesmo código). 8 casos travados por SHA; linha de base registrada acima. No eval, o rate limit espera e tenta de novo. |
| 2026-11-05 | — | Achados extras corrigidos: modelo removido do Groq (novo padrão `openai/gpt-oss-120b`), "request too large" não reagenda mais para sempre, `relativePath` POSIX no Windows, tag "Unknown". |
| 2026-11-05 | 0.5 | Opção A implementada: `ProjectCollaborator` (migration `20261105130000`), convites com notificação, estatísticas por membro no `user-worker` (cada commit creditado a no máximo um membro), seção "Equipe" no painel, aceite pelo sino, acesso a privados para membros, colaborações no perfil. 11 testes de integração + testes unitários. |
| 2026-11-05 | 0.7 | Eval com 22 casos (7 do time + 15 open source). Nova linha de base de heurísticas: 61/76. |
| 2026-11-05 | 0.7 | Linha de base com LLM nos 22 casos: 80/94 checks; 5 casos (23%) não cabem no free tier (413, prompt > 8K tokens/min). |
| 2026-11-05 | 0 | Fase 0 encerrada. E2E do fluxo de equipe (dono convida, colega aceita pelo sino, projeto no perfil). Corrigido de quebra um bug antigo: o modal de projeto do perfil quebrava no SSR com link direto (`document is not defined`). |
| 2026-11-05 | 0.7 | Corrigido o diagnóstico dos 413: não é o README (já cortado em ~1K tokens), é o prompt fixo (~3,5K tokens) + a árvore de pastas. O Groq também conta o `max_completion_tokens` no limite por minuto. |
| 2026-11-05 | 1 | Fase 1 concluída: `services/worker/analyze/repo-map/` (grafo de imports + PageRank, churn, gerados, módulos, higiene, maturidade medida), persistido em `RepositoryAnalysis.repoMap`. Classificação com fatos (pacote publicável, notebooks, research só sem CI, frases de aprendizado/demo, backends no tipo de app), README `.rst`, GDScript/Godot. Eval de heurísticas: 61/76 → 107/110. 28 testes unitários novos. |
| 2026-11-05 | CI | E2E da `main` quebrado desde agosto: `ubuntu-latest` virou Ubuntu 26 (sem build do Playwright 1.59) e faltava `AUTH_TRUST_HOST` no build de produção do CI. Runners fixados em `ubuntu-24.04`, variável adicionada (e no `.env.example`), falhas do Playwright viram anotações no PR. CI verde. |
| 2026-11-05 | 2 | Fase 2 iniciada (branch `feat/analysis-phase-2`, sobre a Fase 1). Desenho ajustado ao free tier do Groq: orçamento por chamada configurável, até 3 maps + 1 reduce, limitador de tokens/min. |
| 2026-11-05 | 2 | Análise em duas etapas implementada (`services/worker/llm/two-stage/`): map com linhas reais, validador determinístico, checagem em lote (refutou o falso "senha antes do hash" do flask), reduce com referências checadas, notas por eixo. `AnalysisRun`/`AnalysisClaim`/`ProjectScore` (migration `20261105200000`). Links de evidência na UI. Eval com LLM em 4 casos: 41/44 → 42/44 após ajustes; o Retold, que dava 413, agora roda (16 afirmações verificadas, 15K tokens, 4 min). Problemas de higiene medidos viram sugestão em código quando o LLM não os cita; ids `(c10)` removidos do texto. Falhas restantes: `purpose` de trabalhos sem README (Fase 1). |
