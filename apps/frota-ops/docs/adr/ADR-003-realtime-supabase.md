# ADR-003 — Supabase Realtime para atualizações ao vivo

**Data:** 2026-01-01  
**Status:** Aceito  
**Contexto:** I-Frotas PWA — dashboard e pátio

---

## Contexto

O dashboard e a tela de pátio precisam mostrar o estado atual da frota em tempo real — mudanças de status de veículos feitas por outros operadores devem aparecer sem recarregar a página.

## Decisão

Usar **Supabase Realtime** (Postgres CDC via WebSocket) nas tabelas `frota_veiculos` e `frota_reservas`.

## Motivação

- Nativo do Supabase — zero infraestrutura adicional (sem Redis pub/sub, sem WebSocket server próprio)
- Postgres CDC garante que toda mudança no banco é propagada — sem risco de mensagens perdidas
- Operadores em pátios diferentes precisam ver o mesmo estado — Realtime elimina a necessidade de F5 manual

## Consequências

**Positivas:**
- UX significativamente melhor — pátio sempre atualizado
- Implementação simples via `supabase.channel().on('postgres_changes', ...)`

**Negativas:**
- Custo de conexão WebSocket por usuário ativo (monitorar no Supabase dashboard) — RS-04 exige habilitar apenas onde necessário
- Subscriptions acumulam se não forem limpas ao trocar de rota — `unsubscribeAll()` chamado no `hashchange` (implementado em `realtime.js`)
- Em caso de reconexão, pode haver gap de eventos — UI faz refetch completo na reconexão

## Alternativas consideradas

- **Polling periódico**: rejeitado — ineficiente, introduz latência variável, consome mais requests na quota
- **Server-Sent Events**: rejeitado — unidirecional, sem suporte nativo a filtragem por tabela/condição como o Realtime
