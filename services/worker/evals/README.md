# Eval da análise de repositórios

O eval mede se a análise acerta, rodando o **mesmo pipeline da produção** (`pipeline.ts`) contra repositórios com
respostas conhecidas. Toda mudança de heurística, de prompt ou de modelo deve vir com o resultado do eval antes e depois.

## Como rodar

```bash
pnpm eval                          # só heurísticas: grátis, sem LLM, cerca de 1s por caso (fora o clone)
pnpm eval --llm                    # pipeline completo, com o LLM configurado
pnpm eval --llm --case flask       # um caso só (pode repetir --case)
LLM_MODEL=qwen/qwen3.8-27b pnpm eval --llm   # comparar outro modelo
```

- Os repositórios são baixados uma vez em `<tmp>/retold-eval-repos/` (cache) e travados no commit do campo `ref`.
- Os relatórios ficam em `services/worker/evals/results/` (ignorado pelo git), em `.md` legível e `.json`.
- O comando sai com código 1 se algum check falhar. Isso permite colocá-lo no CI depois.
- No modo `--llm`, rate limits do provedor fazem o eval esperar e tentar de novo (até 3 vezes, no máximo 2 min cada).

## Como adicionar um caso

Edite `cases.json`. Cada caso é um repositório **público** travado num commit:

```json
{
  "id": "meu-tp-de-grafos",
  "repo": "usuario/tp1-grafos",
  "ref": "<sha completo do commit>",
  "notes": "Por que esse caso existe e o que ele testa.",
  "expect": {
    "primaryLanguage": "C",
    "purpose": ["learning"],
    "domain": ["systems"],
    "appType": ["CLI / Console App"],
    "frameworksInclude": [],
    "llmMustMention": ["grafo|graph"],
    "llmMustNotMention": ["production-ready|enterprise"]
  }
}
```

Para pegar o SHA: `git ls-remote https://github.com/usuario/repo.git HEAD`.

Todos os campos de `expect` são opcionais:

| Campo | O que verifica |
|---|---|
| `primaryLanguage` | Linguagem principal exata |
| `purpose` | Valores aceitos entre `learning`, `research`, `production`, `demo` |
| `domain` | Valores aceitos entre `web`, `systems`, `data`, `academic`, `library`, `cli`, `unknown` |
| `appType` | Valores aceitos entre `Frontend`, `Backend`, `Fullstack`, `CLI / Console App`, `Unknown` |
| `frameworksInclude` | Frameworks que precisam ser detectados |
| `llmMustMention` | Regex (sem diferenciar maiúsculas) que precisa aparecer na resposta do LLM. Use para fatos centrais do projeto |
| `llmMustNotMention` | Regex que **não** pode aparecer. Use para alucinações e elogios falsos já vistos |

**Regra de ouro:** escreva o que é **verdade** sobre o repo, não o que o sistema responde hoje. Um caso que falha
é informação útil, não algo para "consertar" mudando a expectativa.

## Que casos faltam (meta: 20–30)

Os 8 casos iniciais são projetos open source conhecidos. Faltam os casos que representam **os usuários do Retold**,
que só vocês conseguem escolher:

- [ ] 4–6 trabalhos de faculdade reais (de vocês, de colegas): C/Java/Python, com e sem README
- [ ] 3–4 CRUDs/apps de portfólio típicos de estudante (React + API, Next.js, Spring)
- [ ] 2–3 projetos sem README nenhum
- [ ] 2–3 READMEs em português
- [ ] 1–2 monorepos (o próprio Retold, se ele for público)
- [ ] 1–2 projetos de dados/notebooks
- [ ] Casos de regressão: cada bug de análise reportado por usuário vira um caso
