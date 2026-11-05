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

## Fase 0: Arrumar a base (1–2 semanas)

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
| LLM (`pnpm eval --llm`, `groq/openai/gpt-oss-120b`, 22 casos) | **80/94** checks, 5 casos com erro | Os 5 erros (`ripgrep`, `web-dev-for-beginners`, `retold`, `vllm`, `tabnews`) são `413 Request too large`: o prompt passa do limite de **8.000 tokens/min do free tier**, sempre por causa de README grande. **23% dos repos não são analisáveis no free tier.** Nas checagens de texto, o LLM não percebe o `node_modules` commitado no `GETAPET` (o scan ignora a pasta, então ele nunca vê) e não cita Godot no `light-devil`. Cerca de 70K tokens de entrada e 43K de saída nos 17 casos que rodaram (média de ~4K/~2,5K). |

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
- [ ] Confirmar qual modelo a produção usa e se as análises estão falhando por lá.
- [ ] **Decidir o que fazer com o limite de 8K tokens/min do free tier** (23% dos repos do eval falham com 413):
      (a) cortar o README enviado ao LLM para ~12K caracteres (todos cabem, com menos contexto), ou (b) subir para o
      Developer tier do Groq. A Fase 2 resolve de vez com orçamento de tokens por chamada.
- [ ] Rodar `pnpm test:web:integration` com o Redis do Retold na porta 6379 e o `pnpm dev` parado. O teste
      `project-actions` enfileira jobs de verdade: com o worker local rodando, ele consome o job ("job locked by
      another worker"); no CI isso não acontece.

## Fase 1: Entender o repo sem LLM (2 semanas)

- [ ] Grafo de imports (compilador do TypeScript para TS/JS; tree-sitter para outras linguagens) e centralidade por arquivo.
- [ ] Churn por arquivo (`git log --numstat`) e detecção de arquivos gerados.
- [ ] Divisão em módulos (workspaces, pacotes, pastas de domínio).
- [ ] Fatos por módulo: LOC, proporção de testes, dependências relevantes, complexidade aproximada.
- [ ] "Mapa do repo" persistido (JSON), substituindo a heurística de palavras-chave.
- [ ] Maturidade **medida** (CI executa testes? cobertura aproximada?) em vez de inferida do README.

## Fase 2: Análise em duas etapas com evidência verificada (3 semanas)

- [ ] **Map:** por módulo, enviar os arquivos mais centrais (orçamento < 100K tokens por chamada). A saída é JSON com
      responsabilidades, padrões, implementações notáveis e riscos, cada item com `{file, startLine, endLine}`.
- [ ] **Validador:** confere se o arquivo e as linhas existem e se o trecho tem relação com a afirmação; descarta o resto.
- [ ] **Reduce:** síntese do projeto com resumo, arquitetura, pontos fortes e fracos, e notas por eixo com justificativa e evidências.
- [ ] Saída estruturada validada com zod. Prompts curtos.
- [ ] Novos modelos: `AnalysisRun` (versão do pipeline, modelo, tokens, custo, status), `AnalysisClaim`, `ProjectScore`.
- [ ] Manter os modos de privacidade de `privacy.ts`.

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
