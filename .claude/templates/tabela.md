# Template: Documentação de Tabela

```markdown
# Tabela: {{nome_da_tabela}}

**Schema**: public
**Migration**: `{{YYYYMMDD_HHMMSS_descricao.sql}}`
**Feature**: {{FEATURE_QUE_CRIOU_ESTA_TABELA}}

---

## Propósito

{{DESCRICAO_DO_QUE_ESTA_TABELA_ARMAZENA}}

---

## Schema

| Coluna | Tipo | Nullable | Padrão | Descrição |
|--------|------|----------|--------|-----------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Chave primária |
| `user_id` | `uuid` | NOT NULL | — | FK para auth.users |
| `{{coluna}}` | `{{tipo}}` | {{NOT NULL/NULL}} | `{{padrao}}` | {{descricao}} |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Data de criação |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Data da última atualização |

---

## Relacionamentos

| Tabela | Tipo | Coluna | On Delete |
|--------|------|--------|-----------|
| `auth.users` | FK | `user_id` | CASCADE |
| `{{tabela}}` | FK | `{{coluna_fk}}` | {{RESTRICT/CASCADE/SET NULL}} |

---

## Índices

| Nome | Colunas | Tipo | Propósito |
|------|---------|------|-----------|
| `idx_{{tabela}}_user_id` | `(user_id)` | B-tree | FK lookup |
| `{{nome_indice}}` | `({{colunas}})` | {{tipo}} | {{para que serve}} |

---

## Row Level Security

**RLS Habilitado**: Sim

### Políticas

| Política | Operação | Role | Regra |
|----------|----------|------|-------|
| `usuarios_veem_proprios_registros` | SELECT | authenticated | `auth.uid() = user_id` |
| `usuarios_criam_proprios_registros` | INSERT | authenticated | `auth.uid() = user_id` |
| `usuarios_atualizam_proprios_registros` | UPDATE | authenticated | `auth.uid() = user_id` |
| `usuarios_deletam_proprios_registros` | DELETE | authenticated | `auth.uid() = user_id` |

---

## Triggers

| Trigger | Evento | Função |
|---------|--------|--------|
| `trg_before_update_{{tabela}}` | BEFORE UPDATE | `update_updated_at()` |

---

## Exemplos de Query

```sql
-- Buscar registros do usuário logado
SELECT id, {{coluna1}}, {{coluna2}}, created_at
FROM {{tabela}}
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- Inserir novo registro
INSERT INTO {{tabela}} (user_id, {{coluna1}}, {{coluna2}})
VALUES (auth.uid(), $1, $2)
RETURNING id, {{coluna1}}, created_at;
```

---

## Dados de Exemplo

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "{{coluna1}}": "{{exemplo}}",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```
```
