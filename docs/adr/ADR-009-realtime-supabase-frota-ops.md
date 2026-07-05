# ADR-009 — Supabase Realtime para atualizações ao vivo no frota-ops

**Data:** 2026-01-01 (registrada originalmente em `apps/frota-ops/docs/adr/`, consolidada aqui em 2026-07-05)
**Status:** Aceito
**Contexto:** i-Frotas PWA (`apps/frota-ops`) — dashboard e pátio

---

## Contexto

O dashboard e a tela de pátio precisam mostrar o estado atual da frota em tempo real — mudanças de status de veículos feitas por outros operadores devem aparecer sem recarregar a página.

## Decisão

Usar **Supabase Realtime** (Postgres CDC via WebSocket) nas tabelas `frota_veiculos` e `frota_reservas`.

## Motivação

- Nativo do Supabase — zero infraestrutura adicional (sem Redis pub/sub, sem WebSocket server próprio).
- Postgres CDC garante que toda mudança no banco é propagada — sem risco de mensagens perdidas.
- Operadores em pátios diferentes precisam ver o mesmo estado — Realtime elimina a necessidade de F5 manual.

## Consequências

**Positivas:**
- UX significativamente melhor — pátio sempre atualizado.
- Implementação simples via `supabase.channel().on('postgres_changes', ...)`.

**Negativas:**
- Custo de conexão WebSocket por usuário ativo (monitorar no Supabase dashboard) — RS-04 exige habilitar apenas onde necessário.
- Subscriptions acumulam se não forem limpas ao trocar de rota — `unsubscribeAll()` chamado no `hashchange` (implementado em `realtime.js`).
- Em caso de reconexão, pode haver gap de eventos — UI faz refetch completo na reconexão. **Nota da Technical Audit de 2026-07-05:** esse refetch completo também acontece em toda mudança individual de linha, não só na reconexão — ver dívida técnica D5 (recarregamento de tabela inteira por evento realtime), ainda não corrigida.

## Alternativas consideradas

- **Polling periódico**: rejeitado — ineficiente, introduz latência variável, consome mais requests na quota.
- **Server-Sent Events**: rejeitado — unidirecional, sem suporte nativo a filtragem por tabela/condição como o Realtime.

---

**Nota de consolidação (2026-07-05):** esta ADR existia originalmente em `apps/frota-ops/docs/adr/ADR-003-realtime-supabase.md`, uma pasta órfã criada quando o frota-ops era um repositório standalone (antes da unificação de repos). Renumerada para ADR-009 e movida para cá — ver Technical Audit de 2026-07-05, item D8 — para eliminar a duplicação de numeração com a sequência canônica (que já tinha seu próprio ADR-003, sobre o algoritmo de disponibilidade por pool).
