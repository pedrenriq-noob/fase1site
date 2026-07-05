# Prompt: Nova Feature

## Contexto

Use este prompt ao iniciar o desenvolvimento de uma nova funcionalidade. Ele ativa as skills corretas e garante que o processo completo seja seguido, desde a análise de negócio até a entrega em produção.

---

## Prompt para o Claude

```
Preciso implementar a seguinte feature:

[DESCRIÇÃO DA FEATURE]

Issue/Ticket: #[NÚMERO]
Critérios de aceite: [LISTAR OU REFERENCIAR O DOCUMENTO]

Por favor, ative os seguintes especialistas nesta ordem:

1. Business Architect: valide que entendo o problema de negócio corretamente.
   Identifique casos de borda que não estejam nos critérios de aceite.

2. Software Architect: projete a solução técnica. Defina:
   - Módulos que serão criados ou modificados
   - Contratos de interface entre componentes
   - Necessidades de banco de dados
   - Edge Functions necessárias

3. Technical Critic: questione o design proposto.
   Identifique riscos e alternativas mais simples.

4. Supabase Specialist: se houver mudanças no banco, projete:
   - Schema da migration
   - Políticas RLS necessárias

5. Vanilla JS Engineer: implemente o frontend seguindo standards/javascript.md

6. Security Reviewer: revise os aspectos de segurança da implementação

7. QA Engineer: defina o plano de testes e critérios de QA

Siga o workflow completo em workflows/nova-feature.md
```

---

## Skills Ativadas

| Ordem | Especialista | Fase |
|---|---|---|
| 1 | Business Architect | Análise de requisitos |
| 2 | Software Architect | Design da solução |
| 3 | Technical Critic | Revisão crítica |
| 4 | Supabase Specialist | Banco e RLS |
| 5 | Vanilla JS Engineer | Implementação frontend |
| 6 | Mobile UX Specialist | Se houver UI mobile |
| 7 | PWA Specialist | Se houver features offline |
| 8 | Security Reviewer | Revisão de segurança |
| 9 | Code Reviewer | Revisão de qualidade |
| 10 | Business Rules Auditor | Validação de regras |
| 11 | QA Engineer | Testes e validação |

---

## Passos de Execução

1. **Análise**: entender o problema de negócio (não a solução)
2. **Design**: projetar a solução técnica antes de codar
3. **Aprovação**: obter OK do tech lead no design
4. **Branch**: criar branch `feature/NNN-descricao`
5. **Migration**: se necessário, criar e revisar antes de implementar
6. **Implementação**: seguir a ordem de fora para dentro (DB → backend → frontend)
7. **Checklist**: preencher todos os checklists relevantes
8. **PR**: abrir com template de pull-request.md
9. **Review**: aguardar e resolver comentários
10. **QA**: aguardar validação do QA Engineer
11. **Deploy**: seguir workflow/deploy.md

---

## Entregáveis Esperados

- [ ] Documento de requisitos na issue (critérios de aceite verificáveis)
- [ ] Design técnico aprovado (comentário ou ADR)
- [ ] Migration criada e revisada (se aplicável)
- [ ] Código implementado seguindo todos os padrões
- [ ] Checklists preenchidos (frontend, backend, supabase, segurança)
- [ ] PR aberto com template completo
- [ ] Aprovação de QA documentada
- [ ] Feature em produção
- [ ] CHANGELOG.md atualizado
