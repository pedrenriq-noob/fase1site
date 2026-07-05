# Prompt: Nova API (Edge Function)

## Contexto

Use este prompt ao criar uma nova Edge Function no Supabase.

---

## Prompt para o Claude

```
Preciso criar uma Edge Function com as seguintes características:

Nome: [nome-da-funcao]
Método HTTP: [POST | GET | PUT | DELETE]
Propósito: [O que esta função faz]

Request:
- Autenticação: [requerida | pública]
- Body: [estrutura JSON esperada]
- Query params: [se houver]

Response:
- Sucesso: [estrutura da resposta]
- Erros possíveis: [lista de erros e códigos]

Ative os especialistas:

1. Supabase Specialist: implemente a Edge Function com:
   - Verificação de autenticação
   - Validação de inputs
   - Erros padronizados
   - CORS configurado
   - Stateless

2. Security Reviewer: revise:
   - Autenticação e autorização corretas
   - Inputs validados
   - Headers de segurança

3. PostgreSQL Performance: revise queries da função

Use o template em templates/api.md para documentação.
Siga o padrão em standards/supabase.md § Edge Functions
```

---

## Skills Ativadas

| Especialista | Responsabilidade |
|---|---|
| Supabase Specialist | Implementação da Edge Function |
| Security Reviewer | Auth, inputs, headers |
| PostgreSQL Performance | Queries otimizadas |
| Documentation Engineer | Documentação da API |

---

## Entregáveis Esperados

- [ ] `supabase/functions/nome-funcao/index.ts`
- [ ] Autenticação verificada no início
- [ ] Todos os inputs validados
- [ ] Resposta padronizada `{ success, data, error }`
- [ ] CORS configurado para origins corretos
- [ ] Documentação da API em `docs/api/nome-funcao.md`
- [ ] Variáveis de ambiente em `.env.example`
