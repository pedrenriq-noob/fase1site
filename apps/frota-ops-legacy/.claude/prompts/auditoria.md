# Prompt: Auditoria Técnica

## Contexto

Use este prompt para auditorias técnicas periódicas do projeto.

---

## Prompt para o Claude

```
Preciso de uma auditoria técnica do projeto com foco em:

Áreas a auditar: [todas | segurança | performance | qualidade | débito técnico]
Escopo: [módulo específico | projeto inteiro]
Objetivo: [identificar problemas | preparar para crescimento | compliance]

Por favor, ative os especialistas para auditoria abrangente:

1. Security Reviewer: auditoria de segurança completa
   - Verificar RLS em todas as tabelas
   - Auditar Edge Functions
   - Verificar exposição de dados sensíveis

2. PostgreSQL Performance: auditoria de banco
   - Queries lentas (slow query log)
   - Índices não utilizados
   - Tabelas sem índice adequado

3. Code Reviewer: auditoria de qualidade
   - Violações de padrões
   - Complexidade alta
   - Duplicação de código

4. Technical Critic: auditoria de arquitetura
   - Dependências circulares
   - Violações de camadas
   - Débito técnico acumulado

5. Documentation Engineer: auditoria de documentação
   - JSDoc faltando
   - READMEs desatualizados
   - ADRs necessários

Gere um relatório usando templates/relatorio-tecnico.md
```

---

## Entregáveis Esperados

- [ ] Relatório técnico com findings por categoria
- [ ] Severidade de cada problema (crítico/alto/médio/baixo)
- [ ] Plano de ação com prioridades
- [ ] Estimativa de esforço para cada item
