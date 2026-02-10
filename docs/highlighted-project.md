# Sistema de Projeto em Destaque (Highlighted Project)

Este documento descreve como o sistema de seleção e exibição do projeto em destaque funciona no Retold.

## Visão Geral

O projeto em destaque é exibido no topo do feed (Hero Section). Para garantir que o conteúdo seja relevante, visualmente atraente e performático, utilizamos uma abordagem híbrida que combina **SQL Raw**, **Prisma** e **Next.js Caching**.

## Lógica de Seleção (Scoring)

A seleção do projeto não é aleatória. Utilizamos uma query SQL bruta (`$queryRaw`) para calcular um "score de relevância" diretamente no banco de dados.

### Critérios de Filtro

- **Status `DONE`**: Apenas projetos que já passaram pela análise e estão finalizados.
- **Presença de Imagens**: Como o Hero exige um apelo visual, filtramos projetos que possuem pelo menos uma imagem cadastrada.

### Fórmula do Score

Atualmente, o score é calculado da seguinte forma:
`Score = (Quantidade de Likes * 5) + (Total de Visualizações)`

_Nota: Likes possuem um peso maior (5x) que visualizações simples para premiar o engajamento real._

## Arquitetura Técnica

A implementação está dividida em três camadas para otimizar a performance e a experiência do usuário:

### 1. Descoberta do ID (Cacheada)

Localizada em `get-highlighted-project.action.ts`, usamos `unstable_cache` do Next.js para armazenar apenas o **ID** do projeto vencedor.

- **Tempo de Cache**: 1 hora (3600 segundos).
- **Motivo**: Evitar queries complexas de agregação (COUNT e JOIN) em cada reload de página.
- **Tag de Revalidação**: `projects`.

### 2. Busca de Dados Detalhados (Tempo Real)

A partir do ID recuperado do cache, chamamos `projectRepository.getProjectById(id)`.

- **Por que não cachear tudo?** Porque precisamos saber em tempo real se o usuário logado que está visualizando a página já curtiu o projeto ou segue o dono dele. Se cacheássemos o objeto completo, o estado dos botões "Like" e "Follow" ficaria incorreto para diferentes usuários.

### 3. Mapeamento para DTO

O objeto do Prisma é convertido para um `ProjectCardDTO` através do `mapProjectToProjectDTO` para garantir que apenas os dados necessários cheguem ao frontend.

## Por que SQL Raw?

Optamos por SQL Raw em vez do Query Builder do Prisma por dois motivos principais:

1. **Performance**: O PostgreSQL calcula somas e agregações de forma muito mais eficiente que o Node.js. Trazer todos os projetos para a memória para ordenar seria inviável com o crescimento da base.
2. **Complexidade**: O Prisma possui limitações para ordenar por cálculos cross-table (likes de uma tabela + views de outra) em uma única operação.

## Como forçar a atualização

Se você precisar atualizar o destaque instantaneamente (ex: após remover um projeto problemático), você pode disparar uma revalidação via tag:

```typescript
import { revalidateTag } from "next/cache";

// Em qualquer lugar do servidor
revalidateTag("projects");
```

---

_Última atualização: 10 de Fevereiro de 2026_
