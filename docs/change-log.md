# Change Log Tecnico

Este arquivo registra mudancas relevantes feitas no projeto, com foco em:

- o que foi alterado
- por que foi alterado
- quais arquivos foram impactados
- qual risco, bug ou comportamento foi corrigido

Regra daqui para frente:

- toda mudanca relevante que eu fizer no codigo deve ser documentada aqui
- sempre que possivel, registrar o contexto, a motivacao e o impacto
- correcoes de seguranca devem indicar a falha fechada e a estrategia usada

## 2026-04-03 - Hardening dos achados P0 da auditoria

### Contexto

Foram corrigidos os tres achados P0 identificados na auditoria de seguranca:

1. sequestro de instalacao do GitHub App
2. IDOR nas server actions de perfil
3. IDOR em comentarios, likes e views de projetos privados

O objetivo das alteracoes foi mover a protecao para o servidor, eliminar confianca indevida no client e centralizar validacoes criticas.

---

## 1. Sequestro de instalacao do GitHub App

### Problema

O fluxo antigo permitia vincular uma instalacao do GitHub App usando apenas o `installation_id`, sem prova de que a instalacao realmente pertencia a conta GitHub do usuario autenticado.

Na pratica, isso abria espaco para:

- associar instalacoes de terceiros a outra conta no sistema
- acessar repositorios indevidos via token de instalacao
- sequestrar a integracao GitHub App

### Como foi corrigido

O fluxo foi dividido e endurecido em duas etapas:

1. inicio do fluxo em rota propria
2. callback com validacao forte de ownership

#### Etapa 1 - Inicio controlado do fluxo

Arquivo:

- [docs/change-log.md](/C:/Users/mario/OneDrive/Documents/vscode/retold/docs/change-log.md)
- [start/route.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/github/install/start/route.ts)
- [install-flow.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/github/install/install-flow.ts)

O fluxo agora:

- exige usuario autenticado
- exige conta GitHub previamente vinculada
- grava um cookie HttpOnly com o id do usuario autenticado antes do redirect para o GitHub
- usa esse cookie como amarracao do fluxo

Isso impede que o callback da instalacao seja usado fora de um fluxo iniciado pelo proprio usuario autenticado.

#### Etapa 2 - Callback validando ownership real

Arquivos:

- [route.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/github/install/route.ts)
- [save-installation.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/github/install/save-installation.ts)
- [github-installation-authorization.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/domains/github/github-installation-authorization.ts)

No callback agora acontece o seguinte:

- o usuario precisa estar autenticado
- o cookie do fluxo precisa bater com o usuario da sessao
- se a instalacao ja estiver vinculada a outro usuario, a operacao e bloqueada
- a conta GitHub linkada do usuario e consultada
- as organizacoes da conta GitHub linkada tambem sao consultadas
- a instalacao so e aceita se pertencer ao usuario GitHub linkado ou a uma organizacao da qual ele realmente participa

### Ajustes complementares

Arquivos:

- [link/route.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/api/github/link/route.ts)
- [callback/route.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/api/github/callback/route.ts)
- [auth.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/domains/auth/auth.ts)

Tambem foi necessario:

- adicionar `read:org` ao escopo da integracao GitHub
- atualizar conta GitHub ja vinculada com token e scope novos no callback OAuth

Sem isso, a validacao de ownership por organizacao ficaria incompleta.

### Impacto esperado

- elimina o takeover por `installation_id`
- impede vinculo cruzado de instalacoes
- reduz risco de acesso indevido a repositorios de terceiros

---

## 2. IDOR nas server actions de perfil

### Problema

As server actions de perfil aceitavam `userId` vindo do client. Isso criava um IDOR classico:

- o frontend escondia a acao de usuarios sem permissao
- mas o servidor ainda confiava no id enviado pelo navegador
- um atacante autenticado podia trocar o `userId` e alterar o perfil de outra pessoa

### Como foi corrigido

Arquivo principal:

- [edit-profile.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/(public)/[username]/_actions/edit-profile.ts)

Foi criado um fluxo central de autorizacao para perfil:

- o servidor agora resolve o usuario autenticado a partir da sessao
- nenhum update de perfil depende mais de `userId` controlado pelo client
- toda mutacao passa a usar o id derivado no servidor

Suporte:

- [server-auth.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/lib/server-auth.ts)

Esse helper centraliza leitura de sessao autenticada e erro de acesso nao autenticado.

### Ajuste nos callsites do frontend

Arquivos:

- [EditProfileModal.tsx](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/(public)/[username]/(profile)/components/EditProfileModal.tsx)
- [EditProfileDetailsModal.tsx](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/(public)/[username]/(profile)/components/EditProfileDetailsModal.tsx)
- [EditAboutModal.tsx](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/(public)/[username]/(profile)/components/modals/EditAboutModal.tsx)
- [EditContactModal.tsx](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/(public)/[username]/(profile)/components/modals/EditContactModal.tsx)
- [EditEducationModal.tsx](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/(public)/[username]/(profile)/components/modals/EditEducationModal.tsx)
- [EditSkillsModal.tsx](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/app/(public)/[username]/(profile)/components/modals/EditSkillsModal.tsx)

Os componentes deixaram de enviar `profile.id` para as actions de update.

### Impacto esperado

- elimina alteracao arbitraria de perfil de terceiros
- remove a dependencia de ownership no frontend
- torna a protecao efetiva mesmo com payload adulterado no navegador

---

## 3. IDOR em comentarios, likes e views de projetos privados

### Problema

As actions de projeto aceitavam interacao sobre `projectId` sem garantir que o usuario atual podia acessar aquele projeto.

Isso permitia abuso sobre projetos privados, incluindo:

- leitura de comentarios
- criacao de comentarios e replies
- likes
- incremento de views
- sinais laterais de existencia e atividade em projetos privados

### Como foi corrigido

Foi criado um guard central de acesso a projeto:

- [project-access.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/domains/project/lib/project-access.ts)

Esse helper:

- resolve o projeto
- verifica se ele existe
- verifica se o usuario atual pode acessa-lo
- bloqueia recursos privados para usuarios nao autorizados

### Actions endurecidas

Arquivos:

- [comment.actions.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/domains/project/actions/comment.actions.ts)
- [toggle-like.action.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/domains/project/actions/toggle-like.action.ts)
- [increment-view.action.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/domains/project/actions/increment-view.action.ts)
- [get-project-analysis.action.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/domains/project/actions/get-project-analysis.action.ts)

Agora:

- comentario exige autenticacao e acesso valido ao projeto
- reply valida que o comentario pai pertence ao mesmo projeto
- delete de comentario exige ownership do comentario e acesso ao projeto
- leitura de comentarios de projeto privado nao autorizado retorna vazio
- like exige acesso valido ao projeto
- view exige acesso valido ao projeto antes de registrar impressao
- analise do projeto tambem reutiliza o mesmo guard para manter consistencia

### Impacto esperado

- fecha interacao indevida em projeto privado
- reduz enumeracao por comportamento
- evita que recursos secundarios fiquem menos protegidos que a visualizacao principal

---

## 4. Ajustes de suporte no frontend do fluxo GitHub

Arquivo:

- [CreateProjectPanel.tsx](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/components/CreateProjectModal/CreateProjectPanel.tsx)

Mudancas:

- o frontend deixou de acionar a rota antiga que limpava instalacoes do usuario
- o botao passou a abrir o fluxo seguro em `/github/install/start`
- foram tratados os eventos de retorno do popup para estados de erro e sucesso

### Remocao de codigo inseguro

Arquivos:

- [index.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/domains/project/actions/index.ts)
- [verify-user-installation.action.ts](/C:/Users/mario/OneDrive/Documents/vscode/retold/apps/web/src/domains/project/actions/verify-user-installation.action.ts)

Essa action antiga foi removida porque:

- nao resolvia o problema de ownership
- apagava vinculacoes do usuario
- nao devia ser parte do fluxo normal de instalacao segura

---

## 5. Validacoes executadas

### Lint

Executado:

```bash
pnpm --filter web run lint -- "src/lib/server-auth.ts" "src/domains/project/lib/project-access.ts" "src/domains/project/actions/comment.actions.ts" "src/domains/project/actions/toggle-like.action.ts" "src/domains/project/actions/increment-view.action.ts" "src/domains/project/actions/get-project-analysis.action.ts" "src/app/(public)/[username]/_actions/edit-profile.ts" "src/app/github/install/route.ts" "src/app/github/install/start/route.ts" "src/app/github/install/save-installation.ts" "src/app/github/install/install-flow.ts" "src/app/api/github/link/route.ts" "src/app/api/github/callback/route.ts" "src/components/CreateProjectModal/CreateProjectPanel.tsx" "src/domains/auth/auth.ts" "src/domains/github/github-installation-authorization.ts"
```

Resultado:

- sem erros

### Build

Executado:

```bash
pnpm --filter web run build
```

Resultado:

- a parte de compilacao de codigo passou
- o build continuou falhando por dependencia externa de Google Fonts em `next/font`
- isso nao apontou falha nas correcoes de seguranca aplicadas

### Testes

Executado:

```bash
pnpm --filter web run test:run
```

Resultado:

- os testes falharam em `get-profile.spec.ts`
- as falhas observadas sao preexistentes e estao ligadas a contrato de testes antigo
- nao ha suite cobrindo especificamente os novos fluxos de autorizacao endurecidos

---

## 6. Riscos residuais

- ainda faltam testes automatizados cobrindo os guards novos
- o restante das server actions do projeto ainda deve passar por padronizacao de autorizacao
- a versao do Next.js ainda precisa ser atualizada no bloco P1 por causa das advisories da auditoria

---

## 7. Proximo bloco recomendado

1. revogacao de sessao apos reset e troca de senha
2. upgrade do Next.js para versao corrigida
3. varredura completa de autorizacao server-side nas demais actions
4. rate limit e respostas neutras em fluxos de cadastro e recuperacao

---

## 2026-04-03 - Hardening dos achados P1 da auditoria

### Contexto

Este bloco atacou os achados P1 ligados a autenticacao, sessao e hardening do framework:

1. revogacao de sessao apos reset e troca de senha
2. upgrade do Next.js para versao segura e validacao de compatibilidade
3. endurecimento das configuracoes de auth e integracao GitHub
4. remocao de configuracao insegura de account linking automatico

O foco foi fechar lacunas de autenticacao no servidor, reduzir superficie sensivel no client e deixar a arquitetura documentada para manutencao futura.

---

## 1. Revogacao de sessao apos reset e troca de senha

### Problema

O sistema usava sessao JWT com duracao de 7 dias e nao tinha um mecanismo de invalidacao por usuario.

Na pratica, isso significava que:

- um cookie JWT roubado podia continuar valido mesmo depois de reset de senha
- a troca de senha no painel nao derrubava sessoes ja emitidas
- tokens antigos de reset ainda podiam continuar ativos em paralelo

### Como foi corrigido

Arquivos:

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260403133000_add_session_version/migration.sql`
- `packages/database/repositories/user.repository.ts`
- `apps/web/src/domains/auth/auth.config.ts`
- `apps/web/src/domains/auth/auth.ts`
- `apps/web/src/domains/auth/services/reset-password.service.ts`
- `apps/web/src/actions/settings.ts`
- `apps/web/src/app/(private)/settings/SettingsClient.tsx`
- `apps/web/src/app/(auth)/reset-password/page.tsx`

Foi introduzido `sessionVersion` no model `User`.

Toda mudanca de senha agora:

- atualiza o hash da senha
- incrementa `sessionVersion`
- remove sessoes persistidas do adapter
- invalida todos os tokens ativos de reset daquele usuario

O callback `jwt` passou a reidratar o token a partir do banco e comparar a versao embutida no JWT com a versao atual do usuario.

Se houver divergencia:

- o token e rejeitado
- a sessao deixa de ser aceita nas proximas requisicoes

### Efeito pratico

- reset de senha agora revoga sessoes antigas
- troca de senha pelo painel tambem revoga sessoes antigas
- links antigos de reset deixam de competir entre si depois de um reset bem-sucedido

### Tradeoff

O sistema agora consulta o banco durante a sincronizacao do JWT para validar `sessionVersion`.

Isso endurece a seguranca, mas adiciona um tradeoff deliberado:

- se o banco estiver indisponivel, a validacao falha fechada e a sessao nao e renovada

Esse comportamento foi mantido de proposito porque, nesse contexto, perder disponibilidade temporariamente e menos arriscado do que manter sessoes potencialmente invalidas.

---

## 2. Upgrade do Next.js para versao segura

### Problema

O projeto estava em uma versao antiga do Next dentro da serie `16.0.x`, enquanto a auditoria anterior ja tinha apontado advisories relevantes envolvendo App Router e Server Actions.

### Como foi corrigido

Arquivos:

- `apps/web/package.json`
- `pnpm-lock.yaml`

O projeto foi atualizado para:

- `next@16.1.1`
- `eslint-config-next@16.1.1`

O build de producao foi executado depois da atualizacao para confirmar que:

- compilacao passou
- TypeScript passou
- geracao de paginas passou

### Observacao

Durante a validacao local, o build sem permissao ampliada falhou ao buscar Google Fonts por restricao de rede do ambiente.

Ao repetir a execucao com permissao apropriada, o build de producao completou com sucesso.

---

## 3. Endurecimento de auth e integracao GitHub

### Problema

A sessao expunha mais dados do que o necessario ao client e o comportamento de account linking estava permissivo demais para um contexto de seguranca endurecida.

### Como foi corrigido

Arquivos:

- `apps/web/src/domains/auth/auth.config.ts`
- `apps/web/src/domains/auth/next-auth.d.ts`
- `apps/web/src/app/(auth)/login/LoginForm.tsx`
- `apps/web/src/locales/pt.json`
- `apps/web/src/locales/en.json`

Mudancas aplicadas:

- o callback `session` deixou de expor `accessToken` OAuth ao client
- o callback `session` deixou de expor `scope` OAuth ao client
- o callback `jwt` passou a sincronizar papel, plano, username, onboarding e presenca de senha direto do banco
- o login passou a tratar explicitamente o erro `OAuthAccountNotLinked`
- o fluxo de reautenticacao apos reset/troca de senha ganhou mensagens de retorno claras no login

### Efeito pratico

- reduz impacto de qualquer XSS ou abuso no client, porque o token OAuth nao fica mais no objeto de sessao do navegador
- reduz drift entre dados do JWT e estado real do usuario
- melhora comportamento seguro quando uma conta OAuth nao deve ser auto-vinculada

---

## 4. Remocao de account linking perigoso

### Problema

O provider GitHub usava `allowDangerousEmailAccountLinking`.

Essa flag permite unir contas por email de forma permissiva e e inadequada quando a postura desejada e de hardening.

### Como foi corrigido

Arquivo:

- `apps/web/src/domains/auth/auth.ts`

Foi removido `allowDangerousEmailAccountLinking` do provider GitHub.

O fluxo esperado agora e:

- usuario autentica pela conta que ja possui
- usuario vincula GitHub explicitamente pelo fluxo controlado da aplicacao

### Efeito pratico

- reduz risco de associacao indevida entre conta local e conta OAuth
- evita auto-linking sem justificativa forte
- reforca que vinculacao de identidade externa precisa acontecer de forma explicita

### Impacto esperado no produto

Usuarios que antes dependiam de unificacao implicita por email podem precisar:

- entrar com a conta original
- vincular GitHub manualmente em `Settings`

Esse atrito foi aceito porque o ganho de seguranca e superior ao beneficio de conveniencia do linking automatico.

---

## 5. Validacoes executadas

### Prisma Client

Executado:

```bash
pnpm --filter @repo/database run db:generate
```

Resultado:

- geracao do client Prisma concluida com sucesso apos introduzir `sessionVersion`

### Lint direcionado

Executado:

```bash
pnpm --filter web run lint -- "src/actions/settings.ts" "src/app/(auth)/login/LoginForm.tsx" "src/app/(auth)/reset-password/page.tsx" "src/app/(private)/settings/SettingsClient.tsx" "src/domains/auth/auth.config.ts" "src/domains/auth/auth.ts" "src/domains/auth/next-auth.d.ts" "src/domains/auth/services/reset-password.service.ts"
```

Resultado:

- sem erros nas areas alteradas do P1

### Build de producao

Executado:

```bash
pnpm --filter web run build
```

Resultado final:

- build de producao concluido com sucesso apos validar o ambiente com permissao de rede adequada

### Testes

Executado:

```bash
pnpm --filter web run test:run
```

Resultado:

- suite executou
- `register.service.spec.ts` passou
- `get-profile.spec.ts` falhou em 3 testes preexistentes e fora do escopo do P1
- as falhas apontam contrato de teste desatualizado no fluxo de perfil, nao regressao direta do bloco de autenticacao

---

## 6. Pendencias operacionais

- aplicar a migration `20260403133000_add_session_version` em todos os ambientes
- garantir deploy da versao nova antes de considerar o comportamento de revogacao como efetivo em producao
- revisar se existem sessoes antigas emitidas antes desta mudanca e planejar expiracao forcada, se necessario
- orientar suporte/produto sobre o novo comportamento de reautenticacao apos troca ou reset de senha
- orientar suporte/produto sobre o fim do linking perigoso por email e possivel necessidade de vinculo manual do GitHub

---

## 7. Riscos residuais

- ainda nao existe suite automatizada cobrindo especificamente revogacao de sessao por `sessionVersion`
- a estrategia continua dependente de disponibilidade do banco para sincronizacao segura do JWT
- o projeto ainda usa `next-auth@5.0.0-beta.30`, o que merece acompanhamento continuo por ainda estar em beta
- o restante das superficies de auth e automacao abusiva ainda precisa de endurecimento no bloco seguinte

---

## 8. Proximo bloco recomendado

1. rate limit e respostas neutras em `register`, `forgot-password`, `check-email` e `check-username`
2. reautenticacao explicita para acoes destrutivas como exclusao de conta
3. headers de seguranca e politicas de origem
4. varredura completa de autorizacao server-side nas demais server actions e rotas

---

## 2026-04-03 - Hardening de abuso, enumeracao e protecao de borda

### Contexto

Este bloco atacou a camada de abuso automatizado e endurecimento de borda da aplicacao:

1. rate limit e respostas neutras em `register`, `forgot-password`, `check-email` e `check-username`
2. reautenticacao explicita para acoes destrutivas, com foco em exclusao de conta
3. headers de seguranca e politicas de origem
4. sweep adicional de autorizacao server-side em actions sensiveis ainda permissivas

O objetivo foi reduzir enumeracao de contas, diminuir valor de automacao hostil e remover a dependencia de sessao "antiga suficiente" para acoes de alto impacto.

---

## 1. Rate limit e respostas neutras nos fluxos publicos

### Problema

Os endpoints publicos de auth e disponibilidade ainda tinham dois problemas:

- comportamento enumeravel por resposta
- ausencia de limitacao consistente contra automacao

Isso permitia:

- descobrir e-mails e usernames existentes
- disparar recuperacao de senha em massa
- automatizar tentativa de cadastro e ver disponibilidade sem muito atrito

### Como foi corrigido

Arquivos:

- `apps/web/lib/redis-rate-limit.ts`
- `apps/web/lib/get-client-ip.ts`
- `apps/web/src/domains/auth/services/public-auth-rate-limit.service.ts`
- `apps/web/src/app/(auth)/_actions/register.ts`
- `apps/web/src/app/(auth)/_actions/forgot-password.ts`
- `apps/web/src/app/(auth)/_actions/check-email.ts`
- `apps/web/src/app/(auth)/_actions/check-username.ts`
- `apps/web/src/domains/auth/services/forgot-password.service.ts`
- `apps/web/src/app/(auth)/register/RegisterForm.tsx`
- `apps/web/src/app/(auth)/choose-username/ChooseUsernameForm.tsx`
- `apps/web/src/app/(auth)/_actions/set-username.ts`

Foi criada uma camada central de rate limit para:

- cadastro por IP, e-mail e username
- recuperacao de senha por IP e identidade
- checks de disponibilidade por IP e identidade
- acoes destrutivas por IP e usuario

Os endpoints `check-email` e `check-username` agora:

- continuam validando formato
- continuam sujeitos a rate limit
- deixaram de revelar se o valor existe no banco

O endpoint `forgot-password` agora:

- continua respondendo com mensagem neutra
- responde com a mesma mensagem neutra mesmo quando o throttle entra em acao

O endpoint `register` agora:

- aplica throttle antes de criar conta
- deixou de devolver uma resposta distinguindo `email` ja existente de `username` ja existente

### Ajuste de UX

Como a disponibilidade agora e neutra:

- o formulario de registro deixou de depender de "disponivel" em tempo real para habilitar o submit
- o fluxo de escolha de username tambem deixou de usar o check publico como selo de disponibilidade

Esse tradeoff foi deliberado: menos conveniencia imediata em troca de menos sinal util para enumeracao.

---

## 2. Reautenticacao explicita para exclusao de conta

### Problema

A exclusao de conta ainda dependia apenas de sessao autenticada.

Na pratica, isso deixava a acao destrutiva vulneravel a:

- uso de sessao roubada ou esquecida
- contexto fraco para uma operacao irreversivel
- tentativa repetida de confirmacao sem prova recente de posse

### Como foi corrigido

Arquivos:

- `apps/web/src/domains/auth/auth.config.ts`
- `apps/web/src/domains/auth/next-auth.d.ts`
- `apps/web/src/lib/server-auth.ts`
- `apps/web/src/actions/settings.ts`
- `apps/web/src/app/(private)/settings/SettingsClient.tsx`
- `apps/web/src/locales/pt.json`
- `apps/web/src/locales/en.json`

Foi introduzido `authenticatedAt` no JWT e na sessao para registrar quando houve autenticacao efetiva.

O fluxo de exclusao agora funciona assim:

- contas com senha local precisam informar a senha atual
- contas sem senha local precisam ter autenticacao recente valida
- se a conta sem senha estiver "fria", o usuario precisa reautenticar com GitHub antes de excluir
- tentativas repetidas de confirmacao passam por rate limit server-side

### Efeito pratico

- uma sessao antiga sozinha nao basta mais para excluir a conta
- sessao roubada sem senha atual nao consegue concluir exclusao em conta local
- conta OAuth-only agora depende de sign-in recente antes da acao destrutiva

### Tradeoff

Para contas sem senha local, a UX ficou mais rigorosa:

- o usuario precisa voltar pelo fluxo de login GitHub para renovar contexto de autenticacao

Isso foi aceito porque exclusao de conta e uma operacao irreversivel e merece um nivel mais forte de prova de posse.

---

## 3. Endurecimento de headers e politicas de origem

### Problema

O app ainda estava sem uma camada explicita de hardening HTTP no proprio repo.

### Como foi corrigido

Arquivos:

- `apps/web/next.config.ts`
- `.env.example`

Foi adicionada configuracao central de headers para toda a aplicacao, incluindo:

- `Content-Security-Policy` minima e segura para este contexto
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`
- `Origin-Agent-Cluster`
- `X-DNS-Prefetch-Control`
- `X-Permitted-Cross-Domain-Policies`
- `Strict-Transport-Security` em producao

Tambem foi adicionada configuracao de `serverActions.allowedOrigins`, derivada de:

- `APP_URL`
- `ADDITIONAL_ALLOWED_ORIGINS`

### Impacto esperado

- reduz risco de clickjacking e framing
- reduz superficie de alguns tipos de abuso de origem e carregamento indevido
- documenta no repo a expectativa de hosts validos para server actions atras de proxy

### Tradeoff

Se a origem externa real da producao nao bater com `APP_URL` ou com `ADDITIONAL_ALLOWED_ORIGINS`, algumas server actions podem ser bloqueadas.

Esse comportamento e desejado como fail-closed, mas exige configuracao operacional correta no ambiente.

---

## 4. Sweep adicional de autorizacao server-side

### Problema

Ainda havia funcoes mutaveis com contexto excessivamente implicito:

- rotinas que assumiam sessao sem validar
- funcoes internas que aceitavam alvo externo desnecessariamente

### Como foi corrigido

Arquivos:

- `apps/web/src/domains/github/github.ts`
- `apps/web/src/domains/project/actions/create-project.action.ts`
- `apps/web/src/domains/project/actions/delete-project.action.ts`
- `apps/web/src/app/(public)/[username]/_actions/post-github-stats.action.ts`

Mudancas aplicadas:

- `getUserRepositories()` passou a falhar de forma segura quando nao ha sessao valida
- `createProjectAction()` deixou de tocar integracao GitHub antes de confirmar autenticacao
- `postGithubStats()` deixou de aceitar alvo externo por `username` e agora opera no usuario autenticado
- as chamadas de atualizacao de stats de GitHub foram ajustadas para esse novo contrato

### Efeito pratico

- reduz risco de mutacao cruzada ou execucao com alvo fornecido externamente
- reforca o padrao de "derivar identidade no servidor"

---

## 5. Validacoes executadas

### Lint direcionado

Executado:

```bash
pnpm --filter web run lint -- "next.config.ts" "lib/get-client-ip.ts" "lib/redis-rate-limit.ts" "src/actions/settings.ts" "src/app/(auth)/_actions/register.ts" "src/app/(auth)/_actions/forgot-password.ts" "src/app/(auth)/_actions/check-email.ts" "src/app/(auth)/_actions/check-username.ts" "src/app/(auth)/_actions/set-username.ts" "src/app/(auth)/register/RegisterForm.tsx" "src/app/(auth)/choose-username/ChooseUsernameForm.tsx" "src/app/(private)/settings/SettingsClient.tsx" "src/app/(public)/[username]/_actions/post-github-stats.action.ts" "src/domains/auth/auth.config.ts" "src/domains/auth/next-auth.d.ts" "src/domains/auth/services/forgot-password.service.ts" "src/domains/auth/services/public-auth-rate-limit.service.ts" "src/domains/github/github.ts" "src/domains/project/actions/create-project.action.ts" "src/domains/project/actions/delete-project.action.ts"
```

Resultado:

- sem erros nas areas alteradas deste bloco

### Build de producao

Executado:

```bash
pnpm --filter web run build
```

Resultado:

- build de producao concluido com sucesso
- um erro intermediario de tipagem em `next.config.ts` foi identificado e corrigido durante a validacao

### Testes

Executado:

```bash
pnpm --filter web run test:run
```

Resultado:

- `register.service.spec.ts` passou
- `get-profile.spec.ts` segue falhando em 3 testes preexistentes
- nao houve evidencia de regressao nova ligada ao bloco de abuso/borda

---

## 6. Pendencias operacionais

- configurar `ADDITIONAL_ALLOWED_ORIGINS` se a producao usar hostnames adicionais, proxy reverso ou dominios canonicos diferentes de `APP_URL`
- validar no ambiente real se proxy e CDN preservam corretamente `Origin`, `Host`, `x-forwarded-for` e `x-real-ip`
- garantir HTTPS real na borda para que `Strict-Transport-Security` faca sentido operacionalmente
- revisar se o provedor OAuth usado para contas sem senha continua disponivel como caminho de reautenticacao para exclusao de conta

---

## 7. Riscos residuais

- `forgot-password` ainda pode ter diferenca de tempo observavel por depender de envio real de e-mail a provedor externo
- a aplicacao ainda depende de Upstash Redis para enforcement consistente dos novos throttles
- o restante da suite automatizada continua com cobertura limitada para flows de abuso e reautenticacao destrutiva
- ainda ha superficie operacional fora do repo, como proxy/Nginx/CDN, que precisa ser validada em ambiente real

---

## 8. Proximo bloco recomendado

1. corrigir exposicao de segredos e placeholders inseguros em `.env.example`, `.env` e documentacao operacional
2. revisar pipeline de deploy manual, rollback e hardening da VPS
3. ampliar testes automatizados para auth, abuso, autorizacao e rotas sensiveis
4. pentest manual complementar em staging com foco em server actions e integracoes GitHub
