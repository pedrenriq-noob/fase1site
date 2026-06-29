# ADR-004 — Código compartilhado em `_shared/` nas Edge Functions

**Data:** 2026-06-01  
**Status:** Aceito  
**Contexto:** Edge Functions `check-disponibilidade` e `criar-solicitacao`

---

## Contexto

As funções `check-disponibilidade` e `criar-solicitacao` precisavam da mesma lógica de cálculo de disponibilidade. A primeira versão importava diretamente de `../check-disponibilidade/index.ts`, o que falhou em produção (Deno não resolve imports entre functions no runtime do Supabase).

## Decisão

Extrair lógica compartilhada para **`supabase/functions/_shared/disponibilidade.ts`** e importar via `from '../_shared/disponibilidade.ts'` em ambas as funções.

## Motivação

- O diretório `_shared/` é o padrão oficial suportado pelo Supabase CLI para código compartilhado entre Edge Functions
- Evita duplicação do algoritmo de disponibilidade (DRY)
- Garante que `criar-solicitacao` usa exatamente a mesma lógica de verificação que `check-disponibilidade`
- O CLI do Supabase inclui `_shared/` automaticamente no bundle de cada função no deploy

## Consequências

**Positivas:**
- Uma única fonte de verdade para `checkDisponibilidade`, `calcularSaidaLavador`, `SLUG_MAP`
- Bug corrigido em `calcularSaidaLavador` (usava `new Date()` sempre — agora aceita `dataReferencia?: Date`)

**Negativas:**
- Mudança em `_shared/disponibilidade.ts` exige redeploy de **ambas** as functions
- Acoplamento: as duas funções dependem do mesmo módulo — mudanças de interface afetam as duas

## Alternativas consideradas

- **Duplicar código em cada function**: rejeitado — dívida técnica imediata, bugs de sincronização garantidos
- **Importar de `check-disponibilidade/index.ts`**: rejeitado — falha em produção no runtime Deno do Supabase
