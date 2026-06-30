# Prompt: Revisão Completa de PR

## Contexto

Use este prompt para fazer uma revisão completa de um Pull Request antes do merge.

---

## Prompt para o Claude

```
Preciso de uma revisão completa do seguinte PR:

PR #[NÚMERO]: [TÍTULO]
Branch: [feature/nome] → main
Arquivos alterados: [lista ou "ver diff"]
Tipo de mudança: [feature | bug fix | refactoring | migration]

Ative TODOS os especialistas relevantes para uma revisão abrangente:

1. Code Reviewer: qualidade, padrões, legibilidade, duplicação

2. Security Reviewer: (sempre ativo)
   - Autenticação e autorização
   - Inputs validados
   - Dados sensíveis protegidos
   - RLS correto (se houver mudanças de banco)

3. Business Rules Auditor:
   - Implementação cobre todos os critérios de aceite?
   - Casos de borda tratados?

4. PostgreSQL Performance: (se houver mudanças de banco)
   - Queries otimizadas
   - Índices adequados

5. QA Engineer:
   - Plano de testes está adequado?
   - Casos de borda testados?

6. Documentation Engineer:
   - JSDoc está completo e correto?
   - README atualizado se necessário?

Para cada problema encontrado, classifique como:
- 🚨 BLOQUEADOR: deve ser corrigido antes do merge
- ⚠️ IMPORTANTE: deve ser endereçado (pode ser em PR separado)
- 💡 SUGESTÃO: melhoria opcional
```

---

## Skills Ativadas

Todos os especialistas relevantes para o tipo de PR.

---

## Entregáveis Esperados

- [ ] Lista de problemas classificados por severidade
- [ ] Checklists de cada área preenchidos
- [ ] Aprovação ou rejeição com motivos claros
- [ ] Sugestões construtivas com exemplos de alternativas
