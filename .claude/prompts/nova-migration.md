# Prompt: Nova Migration

## Contexto

Use este prompt para criar migrações de banco de dados com segurança, seguindo todos os padrões do projeto.

---

## Prompt para o Claude

```
Preciso criar uma migration de banco de dados para:

[DESCREVA A MUDANÇA NECESSÁRIA]

Tabelas afetadas: [lista]
Feature relacionada: Issue #[NÚMERO]
Volume estimado de dados: [registros atuais na tabela]

Por favor, ative os especialistas:

1. Supabase Specialist: projete a migration com:
   - SQL correto e idempotente
   - RLS habilitado em tabelas novas
   - Políticas RLS completas
   - Índices nas foreign keys
   - Trigger de updated_at se necessário
   - Comentários nas tabelas e colunas

2. PostgreSQL Performance: revise:
   - Tipos de dados adequados
   - Índices necessários para queries futuras
   - Impacto em tabelas existentes

3. Security Reviewer: revise:
   - Políticas RLS são restritivas o suficiente?
   - Dados sensíveis têm proteção adequada?

Siga o workflow em workflows/migration.md
Use o template em templates/migration.md
```

---

## Skills Ativadas

| Especialista | Responsabilidade |
|---|---|
| Supabase Specialist | SQL, RLS, estrutura |
| PostgreSQL Performance | Índices, tipos, performance |
| Security Reviewer | RLS adequado, dados sensíveis |

---

## Passos de Execução

1. **Design**: planejar o schema antes de escrever SQL
2. **SQL**: escrever migration idempotente
3. **RLS**: habilitar e criar políticas
4. **Índices**: adicionar índices necessários
5. **Revisão**: 2+ desenvolvedores revisam
6. **Teste local**: `supabase db reset`
7. **Staging**: aplicar em staging primeiro
8. **Produção**: aplicar com backup confirmado

---

## Entregáveis Esperados

- [ ] Arquivo `supabase/migrations/TIMESTAMP_descricao.sql`
- [ ] SQL idempotente (IF NOT EXISTS)
- [ ] RLS habilitado em tabelas novas
- [ ] Políticas RLS para SELECT, INSERT, UPDATE, DELETE
- [ ] Índices em todas as FKs
- [ ] Comentários nas tabelas e colunas
- [ ] SQL de rollback documentado (comentado no arquivo)
- [ ] Revisão aprovada por 2 desenvolvedores
- [ ] Testada em ambiente local e staging
