# Workflow: Migration de Banco de Dados

---

## Objetivo

Garantir que alterações no schema do banco de dados sejam planejadas, revisadas, testadas e aplicadas de forma segura e reversível.

---

## Pré-requisitos

- [ ] Mudança de schema necessária identificada e justificada
- [ ] Ambiente local de desenvolvimento com Supabase CLI configurado
- [ ] Acesso ao ambiente de staging para testes
- [ ] Backup recente do banco de produção confirmado

---

## Passos Detalhados

### Fase 1 — Planejamento

**Responsável**: Software Architect + Supabase Specialist + PostgreSQL Performance

**Passo 1.1 — Documentar a necessidade**
- Por que esta alteração de schema é necessária?
- Qual feature ou correção depende desta migration?
- Qual é o impacto esperado em dados existentes?

**Passo 1.2 — Design da migration**
- Defina exatamente quais objetos serão criados/alterados/removidos
- Mapeie as dependências (FKs, índices, views, funções)
- Identifique dados que precisam ser migrados/transformados

**Passo 1.3 — Análise de impacto**
```sql
-- Verificar tabelas que referenciam a tabela alvo
SELECT
  conrelid::regclass AS tabela_origem,
  conname AS nome_constraint,
  confrelid::regclass AS tabela_referenciada
FROM pg_constraint
WHERE confrelid = 'nome_da_tabela'::regclass;

-- Verificar views que dependem da tabela
SELECT viewname, definition
FROM pg_views
WHERE definition LIKE '%nome_da_tabela%';

-- Verificar volume de dados
SELECT COUNT(*) FROM nome_da_tabela;
SELECT pg_size_pretty(pg_total_relation_size('nome_da_tabela'));
```

**Passo 1.4 — Estratégia para dados existentes**
- Migration sem dados existentes: simples
- Migration com dados existentes: precisa de data migration
- Migration com volume > 1M registros: planeje para não bloquear

**Entregável**: Documento de design da migration na issue

---

### Fase 2 — Escrita do SQL

**Responsável**: Supabase Specialist + PostgreSQL Performance

**Passo 2.1 — Criar o arquivo de migration**
```bash
# Via Supabase CLI (preferido)
supabase migration new nome_descritivo_da_migration

# Arquivo criado em:
# supabase/migrations/YYYYMMDD_HHMMSS_nome_descritivo_da_migration.sql
```

**Passo 2.2 — Escrever SQL da migration**

Template para nova tabela:
```sql
-- Migration: Criar tabela de endereços
-- Relacionada à Issue: #123
-- Data: 2024-01-15
-- Autor: nome@email.com

-- ========================================
-- UP (aplicar migration)
-- ========================================

-- Criar tabela
CREATE TABLE IF NOT EXISTS addresses (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  street        text NOT NULL CHECK (char_length(street) > 0),
  number        text NOT NULL,
  complement    text,
  neighborhood  text NOT NULL,
  city          text NOT NULL,
  state         char(2) NOT NULL,
  postal_code   char(9) NOT NULL,
  country       char(2) NOT NULL DEFAULT 'BR',
  is_default    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(user_id) WHERE is_default = true;

-- Trigger para updated_at
CREATE TRIGGER trg_before_update_addresses
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Habilitar RLS (OBRIGATÓRIO)
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "usuarios_veem_proprios_enderecos"
  ON addresses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "usuarios_criam_proprios_enderecos"
  ON addresses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuarios_atualizam_proprios_enderecos"
  ON addresses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuarios_deletam_proprios_enderecos"
  ON addresses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE addresses IS 'Endereços dos usuários para entrega e cobrança';
COMMENT ON COLUMN addresses.state IS 'Sigla do estado (UF) — 2 caracteres';
COMMENT ON COLUMN addresses.postal_code IS 'CEP no formato 00000-000';
```

Template para adicionar coluna:
```sql
-- Adicionar coluna com DEFAULT para não bloquear tabela grande
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Para NOT NULL em tabela com dados, use o processo em 3 etapas:
-- 1. Adicionar sem NOT NULL
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text;

-- 2. Popular dados existentes
UPDATE users SET display_name = email WHERE display_name IS NULL;

-- 3. Adicionar NOT NULL depois
ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;
```

**Passo 2.3 — Escrever SQL de rollback**
```sql
-- ========================================
-- DOWN (reverter migration — se necessário)
-- ========================================
-- Descomente e execute manualmente se precisar reverter

-- DROP TABLE IF EXISTS addresses CASCADE;
-- (ou o inverso de cada operação UP)
```

**Passo 2.4 — Verificar boas práticas**
- Usa `IF NOT EXISTS` e `IF EXISTS` para idempotência?
- Tem índice na FK?
- RLS está habilitado?
- Políticas RLS estão definidas?
- Tem comentários nas tabelas e colunas?
- Trigger de `updated_at` se necessário?

**Entregável**: Arquivo SQL da migration escrito e revisado

---

### Fase 3 — Revisão

**Responsável**: Security Reviewer + PostgreSQL Performance + Tech Lead

**Passo 3.1 — Revisão de segurança**
- [ ] RLS habilitado em todas as novas tabelas
- [ ] Políticas RLS seguem o princípio do menor privilégio
- [ ] Nenhuma coluna sensível sem proteção
- [ ] Constraints adequadas (NOT NULL, CHECK, FK)

**Passo 3.2 — Revisão de performance**
- [ ] Índices criados para todas as FKs
- [ ] Índices adicionais para colunas de busca frequente
- [ ] Tipos de dados adequados (evitar TEXT quando enum é melhor)
- [ ] Migration não bloqueará a tabela em produção?

**Passo 3.3 — Revisão de migrations destrutivas**
Para `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`:
- Requer aprovação de 2 desenvolvedores sênior
- Confirmar que nenhum código ativo referencia o que será removido
- Confirmar backup antes de aplicar

**Passo 3.4 — Code review no PR**
- Migration incluída no PR da feature correspondente (ou PR separado)
- Use template `templates/migration.md` na descrição do PR

**Entregável**: Migration aprovada por pelo menos 2 revisores

---

### Fase 4 — Teste

**Responsável**: QA Engineer + Developer

**Passo 4.1 — Testar localmente**
```bash
# Aplicar migration no ambiente local
supabase db reset  # cria banco do zero com todas as migrations

# OU aplicar apenas a nova migration
supabase migration up

# Verificar que foi aplicada
supabase migration list
```

**Passo 4.2 — Verificar o schema resultante**
```sql
-- Verificar que a tabela foi criada corretamente
\d nome_da_tabela

-- Verificar RLS
SELECT rowsecurity FROM pg_tables WHERE tablename = 'nome_da_tabela';

-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'nome_da_tabela';

-- Verificar índices
SELECT * FROM pg_indexes WHERE tablename = 'nome_da_tabela';
```

**Passo 4.3 — Testar em staging**
```bash
# Aplicar em staging antes de produção
supabase db push --db-url postgres://... # URL do staging
```

**Passo 4.4 — Testes funcionais**
- Execute os fluxos da feature que depende da migration
- Verifique inserção, leitura, atualização e exclusão
- Teste as políticas RLS com diferentes usuários

**Entregável**: Migration testada e aprovada em staging

---

### Fase 5 — Aplicação em Produção

**Responsável**: Tech Lead + Developer

**Passo 5.1 — Comunicar o time**
- Notifique o time sobre a migration
- Informe se haverá downtime esperado

**Passo 5.2 — Verificar backup**
```bash
# Confirmar que backup recente existe
# (via dashboard do Supabase ou CLI)
supabase db dump --db-url postgres://... > backup_pre_migration.sql
```

**Passo 5.3 — Aplicar em produção**
```bash
supabase db push --db-url $PROD_DB_URL
```

**Passo 5.4 — Verificar aplicação**
```sql
-- Confirmar que migration foi aplicada
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;

-- Verificar o schema
\d nome_da_tabela
```

**Entregável**: Migration aplicada com sucesso em produção

---

### Fase 6 — Validação

**Responsável**: QA Engineer + Developer

**Passo 6.1 — Smoke tests**
- Execute os fluxos principais que dependem da migration
- Verifique que dados existentes não foram afetados

**Passo 6.2 — Monitorar logs**
- Monitore logs por 30 minutos após a migration
- Verifique se há erros de constraint ou políticas RLS

**Passo 6.3 — Documentar**
- Atualize o CHANGELOG.md
- Adicione comentários no código que referencia as novas colunas/tabelas

**Entregável**: Migration validada em produção

---

## Skills Envolvidas

| Fase | Skills Primárias | Skills de Apoio |
|---|---|---|
| Planejamento | Software Architect, Supabase Specialist | PostgreSQL Performance |
| Escrita | Supabase Specialist | PostgreSQL Performance |
| Revisão | Security Reviewer, Tech Lead | PostgreSQL Performance |
| Teste | QA Engineer | Developer |
| Aplicação | Tech Lead | Developer |
| Validação | QA Engineer | — |

---

## Critérios de Conclusão

- [ ] Migration escrita seguindo todos os padrões (RLS, índices, comentários)
- [ ] Revisão aprovada por 2+ desenvolvedores
- [ ] Testada com sucesso em staging
- [ ] Backup confirmado antes de aplicar em produção
- [ ] Aplicada em produção sem erros
- [ ] Dados existentes íntegros após migration
- [ ] Smoke tests passando em produção
- [ ] CHANGELOG.md atualizado
