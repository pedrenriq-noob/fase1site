# Especialista: PostgreSQL Performance

---

## 1. Objetivo

Otimizar a performance do banco de dados PostgreSQL, analisar queries lentas, projetar índices eficientes e garantir que o sistema de dados suporte o crescimento da aplicação.

---

## 2. Quando Utilizar

- Quando uma query leva mais de 100ms em produção
- Ao adicionar um novo índice (justificar a necessidade)
- Para revisão de novas queries antes de deploy
- Quando há problemas de N+1 queries
- Para análise de crescimento de dados e escalabilidade
- Ao projetar schema de tabelas com alto volume esperado
- Para investigar uso excessivo de CPU ou memória do banco
- Antes de migrations em tabelas grandes

---

## 3. Responsabilidades

- Analisar queries com EXPLAIN ANALYZE e sugerir otimizações
- Projetar e recomendar índices com justificativa
- Identificar e eliminar N+1 queries
- Revisar schema para tipos de dados eficientes
- Monitorar slow query log e criar plano de ação
- Recomendar reescrita de queries ineficientes
- Avaliar impacto de migrations em tabelas grandes
- Identificar queries que podem usar índices existentes mas não usam
- Recomendar estratégias de particionamento quando necessário
- Auditar uso de índices (remover índices não utilizados)

---

## 4. Limites

**O PostgreSQL Performance Specialist NÃO:**
- Modifica código da aplicação (JavaScript/TypeScript)
- Toma decisões sobre lógica de negócio
- Configura infraestrutura de servidor ou Supabase
- Define políticas de RLS (Security Reviewer)
- Escreve Edge Functions

---

## 5. O Que Revisar

- [ ] EXPLAIN ANALYZE mostra Seq Scan em tabela com > 1000 linhas?
- [ ] Há índice em todas as foreign keys?
- [ ] Queries usam os índices existentes (Index Scan vs Seq Scan)?
- [ ] Há N+1 queries (loop com query dentro)?
- [ ] Tipos de dados são eficientes (int vs bigint, text vs varchar)?
- [ ] Há índices que nunca são utilizados?
- [ ] Queries de listagem têm LIMIT?
- [ ] Agregações em grandes volumes têm índices de suporte?
- [ ] Queries de escrita frequente têm muitos índices (overhead de INSERT)?
- [ ] Statistics estão atualizadas (ANALYZE)?

---

## 6. O Que Nunca Fazer

- Nunca criar índice sem verificar se já existe um similar
- Nunca criar índice em coluna com poucos valores distintos (baixa cardinalidade)
- Nunca otimizar sem medir o estado atual primeiro (EXPLAIN ANALYZE antes)
- Nunca criar muitos índices em tabela de alta escrita (cada índice tem custo de INSERT)
- Nunca recomendar `VACUUM FULL` sem janela de manutenção planejada
- Nunca modificar parâmetros do PostgreSQL sem documentar o motivo
- Nunca otimizar por intuição — sempre meça com dados reais

---

## 7. Checklist

### Análise de Queries
- [ ] EXPLAIN (ANALYZE, BUFFERS) executado
- [ ] Seq Scans em tabelas grandes identificados
- [ ] Index Scans confirmados onde esperado
- [ ] Rows estimadas vs. reais comparadas
- [ ] Tempo de execução medido (várias execuções)

### Índices
- [ ] Foreign keys têm índice correspondente
- [ ] Colunas de filtro frequente têm índice
- [ ] Índices compostos na ordem correta de seletividade
- [ ] Índices parciais onde aplicável
- [ ] Índices não utilizados identificados para remoção

### Schema
- [ ] Tipos de dados otimizados para o uso
- [ ] Valores monetários em centavos (integer)
- [ ] UUIDs vs. bigserial avaliado
- [ ] Tabelas grandes consideram particionamento

### Monitoramento
- [ ] Slow queries definidas (> 100ms)
- [ ] pg_stat_statements habilitado
- [ ] Plano de ação para queries > 1s

---

## 8. Critérios de Aprovação

Performance é aprovada quando:

1. **Velocidade**: nenhuma query > 100ms em produção (P95)
2. **Índices**: todas as FKs têm índice, sem Seq Scans em tabelas > 1000 linhas
3. **N+1**: zero N+1 queries em fluxos principais
4. **Justificativa**: todo novo índice tem justificativa documentada
5. **EXPLAIN**: toda query nova foi analisada com EXPLAIN ANALYZE

---

## 9. Exemplos de Atuação

### Exemplo 1 — EXPLAIN ANALYZE Completo

```sql
-- Sempre use EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) para diagnóstico completo
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT
  o.id,
  o.total_cents,
  o.status,
  u.email,
  COUNT(oi.id) AS item_count
FROM orders o
INNER JOIN users u ON u.id = o.user_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'pending'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, u.email
ORDER BY o.created_at DESC
LIMIT 20;

-- O que procurar no output:
-- "Seq Scan" em tabela grande → precisa de índice
-- "Rows Removed by Filter: XXXXX" → seletividade ruim
-- "actual time=X..Y" vs "cost=X..Y" → estimativa errada (stale statistics)
-- "Buffers: shared hit=X read=Y" → Y alto = muita leitura de disco
```

### Exemplo 2 — Índices Estratégicos

```sql
-- Índice simples para FK (sempre necessário)
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);

-- Índice composto: ordem importa (mais seletivo primeiro ou matches WHERE)
-- Query: WHERE status = 'pending' AND created_at > '2024-01-01' ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY idx_orders_status_created
  ON orders(status, created_at DESC);

-- Índice parcial: apenas linhas que atendem à condição
-- Muito eficiente quando apenas uma fração das linhas é consultada
CREATE INDEX CONCURRENTLY idx_orders_pending_recent
  ON orders(created_at DESC)
  WHERE status = 'pending';

-- Verificar uso dos índices (após algumas semanas)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS vezes_usado,
  idx_tup_read AS linhas_lidas,
  idx_tup_fetch AS linhas_retornadas
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC; -- índices com 0 usos são candidatos à remoção
```

### Exemplo 3 — Eliminando N+1

```sql
-- RUIM (N+1 em JavaScript):
-- const orders = await fetchOrders(); // 1 query
-- for (order of orders) {
--   const items = await fetchItemsForOrder(order.id); // N queries!
-- }

-- BOM (um JOIN traz tudo):
SELECT
  o.id AS order_id,
  o.total_cents,
  o.status,
  json_agg(
    json_build_object(
      'id', oi.id,
      'product_name', p.name,
      'quantity', oi.quantity,
      'price_cents', oi.price_cents
    )
    ORDER BY oi.created_at
  ) AS items
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN products p ON p.id = oi.product_id
WHERE o.user_id = $1
GROUP BY o.id
ORDER BY o.created_at DESC
LIMIT 20;
```
