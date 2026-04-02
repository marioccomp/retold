# Backup com Google Drive

Este projeto agora possui um fluxo de backup 100% gratuito usando **Google Drive + rclone**, pensado para rodar direto na sua VPS.

O backup cobre:

- **PostgreSQL** com dump consistente via `pg_dump`
- **Redis** opcional, caso voce queira preservar filas ou estado persistido

O backup **nao** cobre MinIO porque, no seu caso, ele e usado apenas em desenvolvimento.

## Arquivos adicionados

- `scripts/backup/backup-to-gdrive.sh`
- `scripts/backup/restore-from-gdrive.sh`
- `scripts/backup/common.sh`
- `scripts/backup/backup.env.example`

## Como funciona

Cada execucao cria um snapshot com timestamp UTC em uma pasta no Google Drive:

```text
retold-production/
  latest.txt
  snapshots/
    2026-04-02T20-30-00Z/
      postgres.sql.gz
      manifest.txt
      checksums.sha256
```

Se `BACKUP_REDIS=true`, o snapshot tambem inclui:

```text
redis-data.tar.gz
```

## Pre-requisitos na VPS

Voce precisa ter estes binarios instalados no servidor:

- `docker`
- `docker compose`
- `rclone`
- `gzip`
- `tar`

### Instalar `rclone` no Ubuntu/Debian

```bash
curl https://rclone.org/install.sh | sudo bash
```

Depois configure o remoto do Google Drive na propria VPS:

```bash
rclone config
```

Crie um remote com um nome simples, por exemplo:

```text
retold-gdrive
```

> Importante: a conexao do Google Drive precisa existir na **VPS**, porque e ela que vai executar o backup automatico.

## Configuracao

Na raiz do projeto:

```bash
mkdir -p scripts/backup
cp scripts/backup/backup.env.example scripts/backup/backup.env
chmod +x scripts/backup/*.sh
```

Edite `scripts/backup/backup.env` com os valores do seu ambiente:

```bash
BACKUP_GOOGLE_DRIVE_REMOTE=retold-gdrive
BACKUP_GOOGLE_DRIVE_PATH=retold-production
BACKUP_COMPOSE_FILE=compose.prod.yaml
BACKUP_POSTGRES_SERVICE=database
BACKUP_REDIS_SERVICE=redis
BACKUP_REDIS=false
BACKUP_RETENTION_DAYS=14
BACKUP_TMP_DIR=/tmp
BACKUP_WRITE_LATEST_MARKER=true
```

### Quando ativar o Redis

Deixe `BACKUP_REDIS=false` se o Redis for so:

- fila BullMQ
- cache
- rate limiting transitorio

Ative `BACKUP_REDIS=true` se voce realmente depende do conteudo persistido do volume `/data`.

## Executando o backup manualmente

Na raiz do projeto:

```bash
bash scripts/backup/backup-to-gdrive.sh
```

O script:

1. gera um dump do Postgres a partir do container `database`
2. opcionalmente tira um snapshot do Redis
3. envia tudo para o Google Drive usando `rclone`
4. remove snapshots mais antigos que `BACKUP_RETENTION_DAYS`
5. atualiza o arquivo `latest.txt`

## Agendamento automatico com cron

Exemplo para rodar todos os dias as 03:15 da manha:

```bash
crontab -e
```

Adicione:

```cron
15 3 * * * cd /var/www/retold && /usr/bin/bash scripts/backup/backup-to-gdrive.sh >> /var/log/retold-backup.log 2>&1
```

Se o caminho do projeto na sua VPS for outro, ajuste o `cd`.

## Restore

Antes de restaurar em producao, o ideal e parar a aplicacao web e os workers para evitar escrita concorrente durante o restore.

Exemplo com o snapshot mais recente:

```bash
bash scripts/backup/restore-from-gdrive.sh --latest --force
```

Restore de um snapshot especifico:

```bash
bash scripts/backup/restore-from-gdrive.sh 2026-04-02T20-30-00Z --force
```

Restore sem Redis:

```bash
bash scripts/backup/restore-from-gdrive.sh --latest --force --skip-redis
```

O restore do Postgres:

- baixa `postgres.sql.gz` do Google Drive
- aplica o dump com `psql` no container `database`
- reutiliza o proprio `POSTGRES_USER` e `POSTGRES_DB` ja existentes no container

Se houver `redis-data.tar.gz` e o restore do Redis estiver habilitado, o script:

- para o servico `redis`
- sobrescreve o volume montado em `/data`
- sobe o servico novamente

## Boas praticas

- Teste o restore pelo menos uma vez em um ambiente separado.
- Nao deixe o backup so existir; valide se ele realmente abre e restaura.
- Se quiser mais seguranca, mantenha tambem o codigo no GitHub e uma copia manual dos segredos criticos fora da VPS.
- Se o `.env` for muito importante para seu desastre total, guarde uma copia segura fora do servidor. Este fluxo nao envia o `.env` automaticamente para evitar subir segredos sem criptografia.

## Limitacoes atuais

- O backup e focado em **dados**, nao em imagem Docker nem snapshot completo da VPS.
- O Google Drive gratuito tem limite de espaco, entao ajuste `BACKUP_RETENTION_DAYS` para caber no seu volume real.
- O restore do Redis e opcional porque, neste projeto, ele tende a ser menos critico que o banco principal.
