# Padrão: SQL e PostgreSQL

> Referência: CLAUDE.md § Regras para Backend (RB-04), Regras para Performance (RP-05, RP-06)

---

## Objetivo

Definir convenções de nomenclatura, padrões de query e práticas de performance para o banco de dados PostgreSQL no Supabase.

---

## Convenções de Nomenclatura

### Tabelas
- **snake_case**, plural
- Nomes descritivos e em inglês
- Sem prefixos de tipo (`tbl_`, `t_`)

```sql
-- CORRETO
CREATE TABLE user_profiles (...);
CREATE TABLE order_items (...);
CREATE TABLE audit_logs (...);

-- ERRADO
CREATE TABLE UserProfile (...);
CREATE TABLE tbl_order_item (...);
CREATE TABLE T_AUDIT (...);
```

### Colunas
- **snake_case**, singular
- Chave primária: sempre `id` (UUID)
- Foreign keys: `{tabela_singular}_id`
- Timestamps: `created_at`, `updated_at`, `deleted_at`
- Booleanos: prefixo `is_`, `has_`, `can_`

```sql
-- CORRETO
CREATE TABLE orders (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users(id),
  product_id    uuid NOT NULL REFERENCES products(id),
  total_cents   integer NOT NULL CHECK (total_cents >= 0),
  status        text NOT NULL DEFAULT 'pending',
  is_paid       boolean NOT NULL DEFAULT false,
  has_invoice   boolean NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);
```

### Índices
- Formato: `idx_{tabela}_{coluna(s)}`
- Para índices únicos: `uq_{tabela}_{coluna(s)}`
- Para índices parciais: descritivo no nome

```sql
-- Exemplos de nomenclatura
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at DESC);
CREATE UNIQUE INDEX uq_users_email ON users(email);
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';
```

### Funções e Triggers
- Funções: snake_case com verbo (`calculate_order_total`, `update_updated_at`)
- Triggers: `trg_{acao}_{tabela}` (`trg_before_update_orders`)

### Constraints
- Primary key: `pk_{tabela}`
- Foreign key: `fk_{tabela}_{referencia}`
- Check: `chk_{tabela}_{descricao}`
- Not null: implícito na definição da coluna

---

## Padrões de Tabelas

### Tabela Base Completa

```sql
CREATE TABLE produtos (
  -- Identidade
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Dados do domínio
  nome        text NOT NULL CHECK (char_length(nome) BETWEEN 3 AND 200),
  descricao   text,
  preco_cents integer NOT NULL CHECK (preco_cents >= 0),
  estoque     integer NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  categoria   text NOT NULL,
  sku         text UNIQUE,

  -- Controle de acesso (para RLS)
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Soft delete
  deleted_at  timestamptz,

  -- Auditoria
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES auth.users(id),
  updated_by  uuid REFERENCES auth.users(id)
);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_before_update_produtos
  BEFORE UPDATE ON produtos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

---

## Padrões de Query

### SELECT — Sempre Especifique Colunas

```sql
-- ERRADO: busca tudo
SELECT * FROM usuarios;

-- CORRETO: especifica o que precisa
SELECT id, nome, email, created_at
FROM usuarios
WHERE deleted_at IS NULL
ORDER BY nome ASC
LIMIT 50;
```

### JOIN — Explícito e Documentado

```sql
-- CORRETO: JOINs explícitos com aliases descritivos
SELECT
  o.id AS order_id,
  o.total_cents,
  o.status,
  u.email AS customer_email,
  u.name AS customer_name,
  COUNT(oi.id) AS item_count
FROM orders o
INNER JOIN users u ON u.id = o.user_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'pending'
  AND o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, u.email, u.name
ORDER BY o.created_at DESC;
```

### INSERT com RETURNING

```sql
-- CORRETO: retorna os dados inseridos
INSERT INTO produtos (nome, preco_cents, user_id)
VALUES ($1, $2, $3)
RETURNING id, nome, preco_cents, created_at;
```

### UPDATE Seguro

```sql
-- CORRETO: sempre com WHERE, use RETURNING para confirmar
UPDATE produtos
SET
  nome = $1,
  preco_cents = $2,
  updated_at = now()
WHERE id = $3
  AND user_id = $4  -- Segurança: só atualiza o próprio registro
RETURNING id, nome, preco_cents, updated_at;

-- Verificar se algo foi atualizado
-- Se rowcount = 0, o registro não existe ou não pertence ao usuário
```

### UPSERT

```sql
-- Inserir ou atualizar se já existe
INSERT INTO configuracoes (user_id, chave, valor)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, chave)
DO UPDATE SET
  valor = EXCLUDED.valor,
  updated_at = now();
```

### Soft Delete

```sql
-- Nunca DELETE direto em tabelas com soft delete
-- ERRADO
DELETE FROM produtos WHERE id = $1;

-- CORRETO: marca como deletado
UPDATE produtos
SET deleted_at = now()
WHERE id = $1 AND user_id = $2;

-- Queries sempre filtram soft deleted
SELECT * FROM produtos WHERE deleted_at IS NULL;
```

---

## Índices

### Quando Criar Índices

Crie índices quando:
- A coluna é usada frequentemente em `WHERE`
- A coluna é usada em `JOIN`
- A coluna é usada em `ORDER BY` em queries frequentes
- O volume de dados justifica (regra geral: > 10.000 registros)

### Tipos de Índices

```sql
-- B-tree (padrão): para comparações =, <, >, BETWEEN
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Composto: para queries com múltiplas condições frequentes
CREATE INDEX idx_orders_user_status ON orders(user_id, status)
WHERE deleted_at IS NULL; -- Índice parcial para excluir deletados

-- GIN: para arrays e JSONB
CREATE INDEX idx_products_tags ON products USING GIN(tags);
CREATE INDEX idx_documents_metadata ON documents USING GIN(metadata jsonb_path_ops);

-- Texto: para buscas full-text
CREATE INDEX idx_products_search ON products
USING GIN(to_tsvector('portuguese', nome || ' ' || COALESCE(descricao, '')));
```

### Análise de Performance

```sql
-- SEMPRE use EXPLAIN ANALYZE antes de criar índices
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders
WHERE user_id = 'uuid'
  AND status = 'pending'
ORDER BY created_at DESC;

-- Identifique Seq Scans em tabelas grandes (problema)
-- Verifique uso de índices existentes
-- Compare cost estimado vs. real
```

---

## Funções e Stored Procedures

```sql
-- Função com SECURITY DEFINER (executa com permissões do criador)
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE  -- Indica que não modifica dados (otimização do planner)
AS $$
DECLARE
  v_order_count integer;
  v_total_spent integer;
BEGIN
  -- Verifica permissão
  IF auth.uid() != p_user_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT
    COUNT(*),
    COALESCE(SUM(total_cents), 0)
  INTO v_order_count, v_total_spent
  FROM orders
  WHERE user_id = p_user_id
    AND status = 'completed';

  RETURN json_build_object(
    'order_count', v_order_count,
    'total_spent_cents', v_total_spent
  );
END;
$$;
```

---

## Views para Dados Comuns

```sql
-- View para dados de usuário completos (sem campos sensíveis)
CREATE OR REPLACE VIEW user_public_profiles AS
SELECT
  u.id,
  u.email,
  p.name,
  p.avatar_url,
  p.bio,
  p.created_at
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id;

-- Sempre documente views com comentário
COMMENT ON VIEW user_public_profiles IS
  'Perfis públicos de usuários sem dados sensíveis. Seguro para exposição via API.';
```

---

## Anti-Padrões SQL

### N+1 Queries
```sql
-- ERRADO: query por usuário em loop (N+1)
-- Loop em JavaScript:
-- for user in users: fetch orders for user  ← N queries!

-- CORRETO: um JOIN traz tudo
SELECT
  u.id, u.name,
  COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;
```

### Sem Índice em Foreign Keys
```sql
-- ERRADO: FK sem índice (lento em JOINs)
ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES users(id);

-- CORRETO: índice junto com a FK
ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES users(id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### LIKE com Wildcard Inicial
```sql
-- ERRADO: não usa índice
WHERE nome LIKE '%produto%'

-- CORRETO: para busca full-text, use tsvector/GIN
WHERE to_tsvector('portuguese', nome) @@ plainto_tsquery('portuguese', $1)
```
