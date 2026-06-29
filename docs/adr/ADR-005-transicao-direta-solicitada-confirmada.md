# ADR-005 — Transição direta de status `solicitada → confirmada`

**Data:** 2026-06-29  
**Status:** Aceito  
**Contexto:** Trigger `validar_transicao_status_solicitacao` no banco de dados

---

## Contexto

O fluxo original de estados de uma solicitação era:
```
solicitada → em_analise → confirmada → concluida
                       ↘ cancelada
```

O operador precisava sempre passar por `em_analise` antes de confirmar, mesmo para solicitações triviais que já chegam prontas para confirmação direta.

## Decisão

Permitir a transição direta **`solicitada → confirmada`** no trigger de validação, mantendo `em_analise` como estado opcional intermediário.

```
solicitada → confirmada → concluida
           ↘ em_analise → confirmada
           ↘ cancelada
```

## Motivação

- Operadores relataram fricção desnecessária para solicitações simples e claras
- `em_analise` ainda existe para casos que requerem análise (documentação pendente, verificação especial)
- A mudança é retrocompatível — solicitações existentes em `em_analise` não são afetadas

## Consequências

**Positivas:**
- Fluxo operacional mais rápido para o caso comum
- Admin panel pode confirmar diretamente sem clique intermediário

**Negativas:**
- Perde a rastreabilidade de "quem analisou" para solicitações confirmadas diretamente
- Se no futuro `em_analise` tiver campos obrigatórios (ex: checklist), a transição direta precisará ser revisada

## Migration aplicada

Migration: `fix_trigger_solicitada_to_confirmada` — aplicada em 2026-06-29 no projeto `lxfnqzuzohudqwibgdic`.
