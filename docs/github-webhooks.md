# GitHub Webhooks System

O sistema de Webhooks do GitHub permite que o **Retold** receba notificações em tempo real sobre atividades nos repositórios dos usuários, como novos commits, permitindo que as estatísticas de projetos e perfis sejam atualizadas instantaneamente sem a necessidade de polling manual.

## Visão Geral

Atualmente, o sistema foca em processar o evento de `push` para manter a paridade de dados entre o GitHub e a plataforma Retold.

### Fluxo de Dados

1.  **Evento Push**: Um usuário faz um push para um repositório vinculado ao Retold.
2.  **Notificação GitHub**: O GitHub envia um payload JSON via POST para o endpoint configurado.
3.  **Validação**: O Retold verifica a assinatura HMAC-SHA256 para garantir que a requisição partiu do GitHub.
4.  **Processamento**: O payload é analisado para extrair estatísticas de commits, linhas adicionadas e removidas.
5.  **Atualização de DB**: As tabelas `GithubStats` (nível usuário) e `UserProjectStats` (nível projeto) são atualizadas em uma única transação.

## Arquitetura

O sistema está dividido em duas partes principais:

### 1. Endpoint API (Next.js)
Localizado em: `apps/web/src/app/api/webhooks/github/route.ts`

Responsável por:
- Receber a requisição HTTP.
- Validar o `GITHUB_WEBHOOK_SECRET`.
- Diferenciar entre eventos de `ping` e `push`.
- Delegar a inteligência de banco de dados para o repositório específico.

### 2. Repositório de Webhook (Prisma)
Localizado em: `packages/database/repositories/webhook.repository.ts`

Responsável por:
- Buscar o `userId` associado à instalação através do login do GitHub.
- Identificar quais projetos na plataforma estão vinculados ao repositório que recebeu o push (via `githubId`).
- Calcular o delta de linhas (adicionadas/removidas) e o contador de commits.
- Gerenciar a lógica de `activeDays` (contagem de dias consecutivos de atividade).

## Configuração Necessária

### Variáveis de Ambiente
Para o funcionamento correto, adicione ao seu arquivo `.env`:

```env
# Segredo definido na configuração do seu GitHub App
GITHUB_WEBHOOK_SECRET=your_secret_here
```

### Configuração no GitHub
Ao configurar o GitHub App ou o Webhook do repositório:
1. **Payload URL**: `https://seu-dominio.com/api/webhooks/github`
2. **Content type**: `application/json`
3. **Secret**: O mesmo valor definido em `GITHUB_WEBHOOK_SECRET`.
4. **Events**: Selecione apenas `Pushes`.

## Tratamento de Erros e Segurança

- **Timing Attacks**: A validação da assinatura usa `crypto.timingSafeEqual` para prevenir ataques de temporização.
- **Transações Atômicas**: O processamento do evento de push usa transações do Prisma (`$transaction`) para garantir que as estatísticas do usuário e do projeto sejam atualizadas juntas ou nenhuma seja.
- **Idempotência**: O sistema registra o `sha` do último commit para evitar processamento duplicado redundante, embora o foco atual seja incremental.

---
*Documentação gerada automaticamente para a feature feat/github-webhooks.*
