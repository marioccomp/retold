# Projetos em equipe (colaboradores)

Um projeto tem **um dono** (`Project.userId`, quem vinculou o repositório pelo GitHub App) e pode ter até
**10 colaboradores**. O projeto aparece uma vez só no feed, e cada membro tem a própria contribuição contada
a partir do mesmo repositório.

## Por que colaboradores e não "cada um vincula o repo"

As instalações do GitHub App são **por conta**, e cada instalação pertence a um único usuário do Retold
(`GithubAppInstallation.installationId` é único e a identidade é verificada). Um colega não consegue listar um repo que
não é dele, então ele entra no projeto **por convite do dono**. O clone continua sendo feito com o token do dono.

## Fluxo

1. O dono convida pelo username na seção **Equipe** do painel do projeto. Uma busca sugere usuários enquanto ele digita.
2. É criado um `ProjectCollaborator` com `status = PENDING` e uma notificação `PROJECT_INVITE` para o convidado.
3. O convidado aceita ou recusa pelo sino de notificações ou pelo próprio painel. Ele já consegue abrir o projeto,
   mesmo privado, para decidir.
   - **Aceitar:** `status = ACCEPTED`; o dono recebe `PROJECT_INVITE_ACCEPTED`; um recálculo de estatísticas é agendado
     (só em projetos públicos).
   - **Recusar:** a linha é apagada. A pessoa pode ser convidada de novo depois.
4. O dono pode remover membros e cancelar convites. Um membro pode sair. Nos dois casos, a linha e as estatísticas
   dessa pessoa no projeto (`UserProjectStats`) são apagadas.

## Contribuição por membro

O `user-worker` (`services/worker/user-worker.ts`) clona o histórico completo da branch padrão e roda um único
`git log --no-merges --numstat`. Cada commit é creditado a **no máximo um** membro
(`attributeCommitAuthor` em `services/worker/contribution-stats.ts`):

1. email exato de um único membro: o commit é desse membro;
2. senão, nome de um único membro: o commit é desse membro;
3. senão (ninguém, ou mais de um membro com o mesmo nome): o commit não é creditado a ninguém.

Assim, duas pessoas com identidades parecidas nunca recebem crédito pelo mesmo trabalho. Commits de quem não é membro
(bots, pessoas de fora) são ignorados.

As estatísticas só são calculadas para projetos **públicos**, a mesma regra de antes.

## Visibilidade

- Projetos privados podem ser abertos pelo dono, pelos colaboradores e pelos convidados (`requireProjectAccess`).
- No perfil de uma pessoa aparecem os projetos dela **e** os projetos em que ela é colaboradora aceita, com o dono
  real e o selo "Colaboração". Convite pendente não aparece.
- Ações de dono (editar, apagar, reanalisar, fixar) continuam só para o dono.

## Código

| O quê | Onde |
|---|---|
| Regras (convidar, responder, remover, montar a equipe) | `apps/web/src/domains/project/lib/collaborators.ts` |
| Server actions | `apps/web/src/domains/project/actions/collaborators.actions.ts` |
| UI da equipe | `apps/web/src/components/ProjectPanel/components/ProjectTeamSection.tsx` |
| Notificações | `apps/web/src/components/NotificationBell.tsx` |
| Acesso a projetos privados | `apps/web/src/domains/project/lib/project-access.ts` |
| Perfil (projetos próprios + colaborações) | `packages/database/repositories/user.repository.ts` |
| Testes | `apps/web/src/tests/integration/project-collaborators.integration.spec.ts` |
