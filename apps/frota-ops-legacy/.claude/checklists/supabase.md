# Checklist: Supabase

> Referência: standards/supabase.md, CLAUDE.md § RS-*

---

## Banco de Dados

- [ ] Todas as tabelas novas têm RLS habilitado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] RLS forçado (`FORCE ROW LEVEL SECURITY`) em tabelas críticas
- [ ] Políticas definidas para todas as operações necessárias (SELECT, INSERT, UPDATE, DELETE)
- [ ] Políticas testadas com usuários de diferentes papéis
- [ ] Nenhuma tabela com RLS desabilitado exposta no schema `public`

## Migrations

- [ ] Migration é idempotente (`IF NOT EXISTS`, `IF EXISTS`)
- [ ] Nomenclatura: `YYYYMMDD_HHMMSS_descricao.sql`
- [ ] Comentários SQL nas tabelas e colunas
- [ ] Trigger de `updated_at` configurado onde necessário
- [ ] Índice em todas as foreign keys
- [ ] SQL de rollback documentado (comentado no arquivo)
- [ ] Testada localmente com `supabase db reset`
- [ ] Testada em staging antes de produção

## Cliente Supabase

- [ ] Cliente inicializado como singleton
- [ ] Apenas a `anon_key` no frontend (nunca `service_role_key`)
- [ ] Variáveis de ambiente validadas na inicialização
- [ ] Erros do Supabase tratados explicitamente (não ignorados)
- [ ] `SELECT` sempre com campos específicos (sem `SELECT *` em produção)
- [ ] `SELECT` com `limit()` para queries de listagem

## Auth

- [ ] Auth do Supabase usado exclusivamente (sem JWT customizado paralelo)
- [ ] `onAuthStateChange` configurado para observar mudanças de sessão
- [ ] Tokens de sessão não armazenados em localStorage manualmente (deixar o Supabase gerenciar)
- [ ] Redirecionamento pós-login para URL segura

## Realtime

- [ ] Habilitado apenas nas tabelas que precisam (não globalmente)
- [ ] Filtros configurados para reduzir eventos recebidos
- [ ] `supabase.removeChannel()` chamado ao desmontar subscriptions
- [ ] Tratamento para status `CHANNEL_ERROR`

## Storage

- [ ] Buckets têm políticas de acesso configuradas
- [ ] Buckets públicos têm justificativa documentada
- [ ] Uploads validam tipo e tamanho de arquivo
- [ ] Paths de arquivo não contêm dados sensíveis
- [ ] Limpeza de arquivos órfãos considerada

## Edge Functions

- [ ] Veja checklist em `checklists/backend.md`
