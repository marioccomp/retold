# Logging Hardening

## Objetivo

Este documento registra a auditoria e o padrão de hardening de logs adotado no projeto para reduzir vazamento de:

- secrets, tokens, cookies e headers sensíveis
- payloads completos de webhook, auth e integrações externas
- PII comum, como email e IP
- stack traces excessivos e objetos de erro crus

## Escopo auditado

Os pontos priorizados nesta rodada foram:

- workers e jobs assíncronos
- rotas e server actions
- auth e OAuth do GitHub
- webhooks do GitHub
- integrações externas como GitHub API, Groq, Resend e MinIO
- handlers de erro em fluxos operacionais e de UI

## Principais riscos encontrados

### Risco alto

- Logs da camada LLM imprimiam README, estrutura, stats, preview de conteúdo e resposta crua do modelo.
- Workers faziam `console.error(err)` e `console.log()` com objetos completos de erro e resultados de análise.
- Webhook do GitHub logava contexto excessivo do push e podia evoluir facilmente para payload bruto.
- Fluxos de auth e callback OAuth usavam `console.error` com erro cru, arriscando expor detalhes internos de provider, request e stack.

### Risco médio

- Server actions e serviços de storage/logística registravam erros genéricos sem contexto operacional consistente.
- Logs de UI usavam `console.error(error)` sem namespace nem contexto mínimo.
- Algumas ações de comentário, notificação, follow, like e stats não diferenciavam falha esperada de falha operacional.

### Risco baixo

- `apps/web/next.config.ts` mantém um `console.warn` de build sobre origem inválida.
- `apps/web/src/locales/patch.js` mantém um `console.log` de script local.

Esses dois pontos remanescentes não carregam dados sensíveis e não participam do tráfego de produção do domínio auditado.

## Padrão adotado

Foi criado o pacote compartilhado `@repo/observability` com:

- `createLogger(service)`
- `sanitizeForLog(value)`
- `serializeError(error)`

### Formato

Os logs agora seguem estrutura consistente:

```ts
const logger = createLogger("web.api.github-webhook");

logger.info("webhook.push_received", {
  deliveryId,
  repositoryId,
  installationId,
  commitCount,
});

logger.error("github.oauth_link_failed", error, {
  currentUserId,
  hasCode: Boolean(code),
});
```

### Regras

- usar `event` estável e orientado a operação
- logar IDs, contagens, flags e status ao invés de payload bruto
- nunca logar tokens, cookies, authorization headers, secrets ou body completo
- nunca logar resposta crua de LLM, README, prompt, código ou HTML completo
- serializar erro com campos controlados
- incluir stack apenas fora de produção e ainda assim truncada

### Sanitização automática

O sanitizador:

- mascara chaves sensíveis como `token`, `secret`, `authorization`, `cookie`, `password`
- resume coleções como `headers`, `formData`, `payload` e `body`
- mascara emails e IPs
- remove padrões comuns de bearer token, JWT e tokens GitHub
- trunca strings grandes

## Eventos operacionais preferidos

Quando possível, usar nomes como:

- `auth.login_unexpected_failure`
- `github.oauth_link_failed`
- `webhook.push_received`
- `webhook.push_processed`
- `worker.job_started`
- `worker.job_failed`
- `storage.object_delete_failed`

Evitar mensagens livres como:

- `console.error(error)`
- `erro ao processar`
- `deu ruim`
- `raw response`

## Pontos endurecidos nesta rodada

- webhook do GitHub
- repositório de processamento de webhook
- worker principal, user worker e last commit worker
- camada LLM do worker
- auth callbacks e actions
- callback OAuth do GitHub e início do install flow
- ações de projeto, comentários, likes, follow e notificações
- upload/deleção de imagem e storage
- integração com GitHub, email e stats
- erros de UI mais relevantes

## Riscos residuais

- SDKs externos ainda podem produzir mensagens sensíveis internamente; nosso logger evita imprimir o objeto cru, mas não impede o provedor de logar por conta própria.
- Dados persistidos em banco, filas e payloads de integrações continuam exigindo revisão separada de retenção e criptografia.
- O `next.config.ts` e o script `src/locales/patch.js` mantêm logs simples de baixo risco.
- O projeto ainda merece uma segunda rodada focada em telemetria, tracing e políticas de retenção/rotação de logs.

## Checklist para novos logs

- o log ajuda a operar ou depurar um fluxo real?
- o contexto usa IDs/contagens em vez de payload completo?
- existe chance de conter token, cookie, header, email, IP ou conteúdo bruto?
- o erro está passando por `logger.error(...)` em vez de `console.error(...)`?
- o nome do evento é estável e pesquisável?
