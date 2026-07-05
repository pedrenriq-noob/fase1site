# Checklist: Banco de Dados

> Referência: standards/sql.md, CLAUDE.md § RM-*

---

## Nomenclatura

- [ ] Tabelas em snake_case plural
- [ ] Colunas em snake_case singular
- [ ] FK seguem padrão `{tabela_singular}_id`
- [ ] Índices seguem padrão `idx_{tabela}_{coluna}`
- [ ] Índices únicos seguem padrão `uq_{tabela}_{coluna}`
- [ ] Funções/triggers em snake_case com verbo

## Estrutura de Tabela

- [ ] Chave primária é `id uuid DEFAULT gen_random_uuid()`
- [ ] Foreign keys com `ON DELETE` explícito (CASCADE, SET NULL, RESTRICT)
- [ ] `created_at timestamptz NOT NULL DEFAULT now()`
- [ ] `updated_at timestamptz NOT NULL DEFAULT now()` (com trigger)
- [ ] Colunas booleanas com prefixo `is_` ou `has_`
- [ ] Valores monetários em centavos (integer), não decimal
- [ ] Status/enum como `text` com `CHECK` constraint
- [ ] `NOT NULL` em todas as colunas obrigatórias

## Índices

- [ ] Índice em cada foreign key
- [ ] Índices em colunas usadas em `WHERE` frequentemente
- [ ] Índices em colunas usadas em `ORDER BY` frequentemente
- [ ] Índices não duplicados verificados
- [ ] Índice composto na ordem de seletividade correta
- [ ] Índices parciais onde aplicável (WHERE status = 'active')
- [ ] CONCURRENTLY usado para índices em tabelas com dados

## Queries

- [ ] `SELECT *` substituído por campos específicos
- [ ] `LIMIT` em todas as queries de listagem
- [ ] `WHERE` presente em `UPDATE` e `DELETE` (nunca sem filtro)
- [ ] `RETURNING` usado após `INSERT`/`UPDATE` para evitar query extra
- [ ] JOINs com aliases descritivos
- [ ] `EXPLAIN ANALYZE` executado para queries de produção

## Migrations

- [ ] Migration não modifica migrations já aplicadas
- [ ] SQL de rollback documentado
- [ ] Migrations destrutivas aprovadas por 2 sêniors
- [ ] Migrations com volume alto de dados testadas com dados reais
- [ ] `IF NOT EXISTS` / `IF EXISTS` para idempotência

## Segurança

- [ ] RLS habilitado em todas as tabelas
- [ ] Políticas RLS seguem princípio do menor privilégio
- [ ] Funções com SECURITY DEFINER têm `REVOKE ALL` + `GRANT EXECUTE` específico
- [ ] Queries parametrizadas (sem concatenação de string para SQL)
