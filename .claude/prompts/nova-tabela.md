# Prompt: Nova Tabela no Banco de Dados

## Contexto

Use este prompt ao criar uma nova tabela no Supabase/PostgreSQL.

---

## Prompt para o Claude

```
Preciso criar uma nova tabela no banco com as seguintes características:

Nome da tabela: [nome_em_snake_case_plural]
Propósito: [Para que serve esta tabela]

Colunas necessárias:
- [coluna 1]: [tipo] - [descrição e constraints]
- [coluna 2]: [tipo] - [descrição e constraints]

Relacionamentos:
- [tabela relacionada]: [tipo de relação] (1:1, 1:N, N:N)

Controle de acesso:
- Quem pode ler: [todos autenticados | apenas o dono | apenas admins]
- Quem pode criar: [...]
- Quem pode editar: [...]
- Quem pode deletar: [...]

Ative os especialistas:

1. Supabase Specialist: crie a migration com:
   - Estrutura completa da tabela
   - RLS habilitado
   - Políticas para cada operação
   - Índices nas FKs e colunas de busca
   - Trigger de updated_at
   - Comentários SQL

2. PostgreSQL Performance: revise:
   - Tipos de dados eficientes
   - Índices necessários para queries típicas

3. Security Reviewer: revise as políticas RLS

Siga standards/sql.md para convenções de nomenclatura
Use template em templates/tabela.md
```

---

## Skills Ativadas

| Especialista | Responsabilidade |
|---|---|
| Supabase Specialist | Schema, RLS, migrations |
| PostgreSQL Performance | Tipos, índices |
| Security Reviewer | Políticas RLS |

---

## Entregáveis Esperados

- [ ] Migration com CREATE TABLE completo
- [ ] RLS habilitado
- [ ] Políticas RLS para todas as operações necessárias
- [ ] Índices em todas as FKs
- [ ] Trigger de `updated_at`
- [ ] Comentários SQL nas tabelas e colunas
- [ ] Documentação em templates/tabela.md
