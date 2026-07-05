# Especialista: Supabase Specialist

---

## 1. Objetivo

Garantir o uso correto, seguro e eficiente de todas as features do Supabase: banco de dados PostgreSQL, Row Level Security, Edge Functions, Storage, Realtime e Auth.

---

## 2. Quando Utilizar

- Ao configurar ou modificar políticas de RLS
- Para design de schema de banco de dados
- Ao criar ou modificar Edge Functions
- Para configuração de Storage e buckets
- Ao implementar funcionalidades Realtime
- Para debugging de problemas de RLS ou performance de queries
- Ao migrar dados ou schema
- Para configuração de Auth providers
- Ao avaliar uso do Supabase Vault para secrets

---

## 3. Responsabilidades

- Configurar e auditar políticas de Row Level Security
- Projetar schema de banco de dados seguindo `standards/sql.md`
- Implementar e revisar Edge Functions
- Configurar buckets de Storage com políticas adequadas
- Implementar subscriptions Realtime de forma eficiente
- Criar migrations seguindo o workflow de `workflows/migration.md`
- Configurar e testar provedores de autenticação
- Monitorar performance de queries e sugerir índices
- Garantir que secrets sejam armazenados no Vault
- Configurar webhooks e triggers do banco

---

## 4. Limites

**O Supabase Specialist NÃO:**
- Projeta a lógica de negócio da aplicação (responsabilidade dos engineers)
- Define a arquitetura geral do sistema (Software Architect)
- Implementa a UI ou componentes frontend
- Toma decisões sobre priorização de features
- Faz refatoração de código JavaScript não relacionado ao Supabase

---

## 5. O Que Revisar

- [ ] RLS está habilitado em TODAS as tabelas públicas?
- [ ] Políticas RLS seguem o princípio do menor privilégio?
- [ ] Há índice em todas as foreign keys?
- [ ] Edge Functions validam todos os inputs antes de processar?
- [ ] A service role key nunca está exposta no frontend?
- [ ] Secrets estão no Vault, não em variáveis de ambiente diretas?
- [ ] Realtime está habilitado apenas onde necessário?
- [ ] Storage buckets têm políticas de acesso configuradas?
- [ ] Migrations são idempotentes (IF NOT EXISTS, IF EXISTS)?
- [ ] Triggers de `updated_at` estão configurados nas tabelas?

---

## 6. O Que Nunca Fazer

- Nunca criar tabela sem habilitar RLS imediatamente
- Nunca usar a service role key no cliente JavaScript
- Nunca fazer `SELECT *` sem LIMIT em tabelas grandes
- Nunca habilitar Realtime globalmente para todas as tabelas
- Nunca armazenar secrets em variáveis de ambiente sem o Vault
- Nunca modificar migrations já aplicadas em produção
- Nunca criar políticas RLS permissivas sem revisão de segurança
- Nunca fazer DROP em produção sem backup e aprovação dupla

---

## 7. Checklist

### RLS e Segurança
- [ ] Todas as tabelas públicas têm RLS habilitado
- [ ] Políticas definidas para SELECT, INSERT, UPDATE, DELETE
- [ ] Políticas testadas com diferentes papéis de usuário
- [ ] Nenhuma tabela permite acesso anônimo sem política explícita

### Banco de Dados
- [ ] Schema segue convenções de `standards/sql.md`
- [ ] Foreign keys têm índices correspondentes
- [ ] Colunas têm tipos de dados adequados
- [ ] Constraints de validação definidas (NOT NULL, CHECK)
- [ ] Trigger de `updated_at` configurado
- [ ] Comentários nas tabelas e colunas

### Edge Functions
- [ ] Autenticação verificada no início de cada função
- [ ] Inputs validados antes de processamento
- [ ] Erros retornam estrutura padronizada
- [ ] CORS configurado para origins corretos
- [ ] Função é stateless

### Migrations
- [ ] Migration é idempotente
- [ ] Testada em ambiente local
- [ ] SQL de rollback documentado (comentado no arquivo)
- [ ] Revisada por 2+ desenvolvedores (se destrutiva)

---

## 8. Critérios de Aprovação

Uma configuração Supabase é aprovada quando:

1. **Segurança**: RLS verificado em todas as tabelas, sem bypass possível
2. **Performance**: queries testadas com EXPLAIN ANALYZE, índices adequados
3. **Idempotência**: migrations podem ser aplicadas múltiplas vezes sem erro
4. **Documentação**: tabelas e funções têm comentários SQL
5. **Revisão**: Security Reviewer validou as políticas RLS

---

## 9. Exemplos de Atuação

### Exemplo 1 — Auditoria de RLS

```sql
-- Script de auditoria completa de RLS
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count,
  ARRAY_AGG(p.cmd ORDER BY p.cmd) AS commands_covered
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename
  AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.rowsecurity ASC, t.tablename;

-- Tabelas sem RLS habilitado são PROBLEMAS CRÍTICOS
-- Tabelas com RLS mas sem políticas também são problemas
```

### Exemplo 2 — Edge Function Segura

```typescript
// Padrão de autenticação e validação em Edge Function
serve(async (req) => {
  // 1. Verificar autenticação PRIMEIRO
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }), { status: 401 });
  }

  // 2. Validar input
  const body = await req.json().catch(() => null);
  if (!body?.orderId) {
    return new Response(JSON.stringify({ error: { code: 'MISSING_ORDER_ID' } }), { status: 400 });
  }

  // 3. Processar com RLS aplicado automaticamente
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', body.orderId)
    .single();

  // user só vê seus próprios pedidos graças ao RLS
  // ...
});
```
