# GitHub Webhooks System

O webhook do GitHub avisa o **Retold** quando há novos commits nos repositórios vinculados, para que as estatísticas de contribuição sejam atualizadas sem polling.

## Visão Geral

Hoje só o evento `push` é processado. O webhook **não conta commits nem linhas**: ele só agenda um recálculo completo, feito pelo `user-worker` a partir do `git log`.

### Por que recalcular em vez de incrementar

A versão anterior incrementava contadores com os dados do payload, e isso tinha quatro problemas:

- creditava **todos** os commits do push ao dono da instalação do GitHub App, mesmo os commits de outros autores;
- contava pushes em **qualquer branch**, então um commit era contado de novo quando a branch era mergeada;
- um reenvio do GitHub (redelivery) **duplicava** os números;
- como só incrementava, um erro nunca era corrigido.

O recálculo é idempotente (rodar duas vezes dá o mesmo resultado) e filtra os commits pelo autor. Com isso, reenvios e commits de outras pessoas deixam de ser um problema.

### Fluxo de Dados

1. **Evento push**: alguém faz push para um repositório vinculado ao Retold.
2. **Validação**: a assinatura HMAC-SHA256 é verificada (`GITHUB_WEBHOOK_SECRET`).
3. **Filtro**: só pushes com commits na **branch padrão** do repositório são considerados (`ref === refs/heads/<default_branch>`). Pushes em outras branches e de tags são ignorados.
4. **Projetos vinculados**: o serviço busca todos os projetos ligados ao repositório pelo `githubId`. Pode haver mais de um usuário.
5. **Agendamento com debounce** (5 minutos):
   - fila `user-analyze`: um job por projeto **público**. Projetos privados ficam fora das estatísticas de contribuição, que é a mesma regra do `user-worker`;
   - fila `github-last-commit`: um job por usuário vinculado, para atualizar o card de "último commit" (esse worker filtra por autor na API do GitHub).
6. **Recálculo**: o `user-worker` clona o histórico completo da branch padrão e roda um único `git log --no-merges --numstat`, que cobre commits, linhas, dias ativos e datas (`services/worker/contribution-stats.ts`).

### Debounce

Os jobs usam a deduplicação do BullMQ em modo debounce (`ttl` + `extend` + `replace`):

- enquanto o job ainda está agendado, um novo push **substitui** o job e reinicia o timer. Uma sequência de pushes gera uma única execução, 5 minutos depois do último;
- depois que o job começa a rodar, o próximo push agenda uma nova execução. Commits enviados durante uma execução não se perdem.

## Arquitetura

### 1. Endpoint API (Next.js)

Localizado em: `apps/web/src/app/api/webhook/github/route.ts`

- Recebe a requisição e valida a assinatura.
- Diferencia `ping` de `push`; outros eventos recebem 200 e são ignorados (evita reenvios).
- Delega o processamento ao serviço de push.

### 2. Serviço de push

Localizado em: `apps/web/src/domains/github/push-webhook.service.ts`

- Aplica os filtros (branch padrão, commits presentes, projetos vinculados).
- Agenda os jobs com debounce.
- Devolve `{ processed, reason }` para o log da rota.

## Configuração Necessária

### Variáveis de Ambiente

```env
# Segredo definido na configuração do seu GitHub App
GITHUB_WEBHOOK_SECRET=your_secret_here
```

### Configuração no GitHub

1. **Payload URL**: `https://seu-dominio.com/api/webhook/github`
2. **Content type**: `application/json`
3. **Secret**: o mesmo valor de `GITHUB_WEBHOOK_SECRET`.
4. **Events**: apenas `Pushes`.

## Tratamento de Erros e Segurança

- **Timing attacks**: a assinatura é comparada com `crypto.timingSafeEqual`.
- **Idempotência**: o webhook só agenda recálculos idempotentes. Um reenvio, no máximo, reinicia o debounce.
- **Falha ao enfileirar**: a rota responde 500 e o GitHub tenta reenviar o evento.
