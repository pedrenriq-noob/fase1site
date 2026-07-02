# ⚠️ ATENÇÃO — Esta pasta é um ESPELHO, não a fonte de produção

O app **I-Frotas** em produção (`https://i-frotas.vercel.app`) é servido pelo
repositório separado:

> **https://github.com/pedrenriq-noob/i-frotas** (pasta `frota/`)

Esta cópia em `apps/frota-ops/` existe apenas por histórico do monorepo e para
as rotas legadas `/frota-ops/` do projeto Vercel `fase1site`.

## Regras

1. **Correção no frota-ops? Aplique PRIMEIRO no repositório `i-frotas`** —
   é ele que deploya para produção.
2. Depois replique aqui, se quiser manter o espelho em dia (diferenças
   esperadas entre as cópias: `manifest.json`/`sw.js`/`index.html` usam
   caminhos `/frota-ops/` aqui e `/frota/` lá; `icons/` e `CHANGELOG.md`
   só existem em um dos lados).
3. Uma mudança commitada só aqui **nunca chega à produção**.

> Incidente que motivou este aviso (2026-07-01): a correção do algoritmo de
> disponibilidade foi implementada nesta pasta e só chegou à produção porque
> a divergência de repositórios foi descoberta durante a revisão pré-commit.
> Plano de longo prazo (ver `docs/governance/`): unificar os repositórios.
