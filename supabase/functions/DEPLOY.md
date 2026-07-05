# Deploy das Edge Functions — checklist obrigatório

> Motivação: em 2026-07-01 um deploy manual quase publicou o
> `_shared/http.ts` **incompleto** (sem `okJson`), o que quebraria a
> `check-disponibilidade` em runtime. O deploy via MCP/dashboard envia
> arquivos explicitamente — não há resolução automática do `_shared/`.

## Regra de ouro

**Mudou qualquer arquivo em `_shared/` → redeploy de TODAS as functions que
o importam, na mesma sessão.**

| Function | Importa de `_shared/` |
|---|---|
| `check-disponibilidade` | `disponibilidade.ts`, `http.ts`, `logger.ts` |
| `criar-solicitacao` | `disponibilidade.ts`, `http.ts`, `pricing.js`, `logger.ts` |
| `admin-user-manager` | `http.ts` |
| `notificar-reserva` | `http.ts`, `logger.ts` (função ativa — provedor de e-mail pendente, mas o handler roda e responde normalmente) |

## Checklist por deploy

1. [ ] Conferir a tabela acima: quais functions importam o arquivo alterado?
2. [ ] Para cada function, enviar **todos** os arquivos: o `index.ts` E cada
       arquivo de `_shared/` que ela importa, com o **conteúdo integral do
       arquivo do repositório** (nunca digitar/reconstruir de memória).
3. [ ] Verificar que cada `export` usado pelo `index.ts` existe no conteúdo
       enviado (o quase-incidente foi exatamente isso).
4. [ ] Smoke test pós-deploy de **cada** function redeployada:
       - `check-disponibilidade`: POST com payload válido → 200 com campos
         `disponivel`/`overbooking`.
       - `criar-solicitacao`: POST com payload vazio → 400 `missing_field`
         (prova que a function inicializa sem erro de import).
5. [ ] `get_logs` (edge-function) sem erros novos.
6. [ ] Commit do código no repositório na mesma sessão do deploy — código
       deployado nunca pode divergir do versionado.
