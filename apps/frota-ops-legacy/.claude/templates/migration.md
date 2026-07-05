# Template: Migration

```sql
-- Migration: {{TITULO_DESCRITIVO}}
-- Issue: #{{NUMERO}}
-- Data: {{YYYY-MM-DD}}
-- Autor: {{NOME}}
--
-- Descrição:
-- {{DESCRICAO_DO_QUE_ESTA_MIGRATION_FAZ}}
--
-- Impacto:
-- - Tabelas criadas: {{LISTA}}
-- - Tabelas alteradas: {{LISTA}}
-- - Volume de dados afetado: {{ESTIMATIVA}}

-- ============================================================
-- UP: Aplicar migration
-- ============================================================

-- {{ADICIONE_SQL_AQUI}}

-- Exemplo de nova tabela:
CREATE TABLE IF NOT EXISTS {{nome_tabelas}} (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  {{coluna_1}}  {{TIPO}} NOT NULL,
  {{coluna_2}}  {{TIPO}},
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_{{tabela}}_user_id ON {{tabela}}(user_id);
-- CREATE INDEX IF NOT EXISTS idx_{{tabela}}_{{coluna}} ON {{tabela}}({{coluna}});

-- Trigger de updated_at
CREATE TRIGGER trg_before_update_{{tabela}}
  BEFORE UPDATE ON {{tabela}}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS (OBRIGATÓRIO)
ALTER TABLE {{tabela}} ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "{{descricao_select}}"
  ON {{tabela}} FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "{{descricao_insert}}"
  ON {{tabela}} FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "{{descricao_update}}"
  ON {{tabela}} FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "{{descricao_delete}}"
  ON {{tabela}} FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE {{tabela}} IS '{{DESCRICAO_DA_TABELA}}';
COMMENT ON COLUMN {{tabela}}.{{coluna}} IS '{{DESCRICAO_DA_COLUNA}}';

-- ============================================================
-- DOWN: Reverter migration (descomente se necessário reverter)
-- ============================================================

-- DROP TABLE IF EXISTS {{tabela}} CASCADE;
-- DROP INDEX IF EXISTS idx_{{tabela}}_user_id;
-- (inverso de cada operação UP)
```
