# Prompt: Correção de Bug

## Contexto

Use este prompt ao corrigir um bug reportado.

---

## Prompt para o Claude

```
Preciso corrigir o seguinte bug:

Issue #[NÚMERO]
Título: [título do bug]
Severidade: [Crítico | Alto | Médio | Baixo]
Ambiente: [produção | staging | desenvolvimento]
Reprodutível: [sempre | às vezes | uma vez]

Descrição do bug:
[Descrever o comportamento atual vs. esperado]

Passos para reproduzir:
1. [passo 1]
2. [passo 2]
3. [passo 3]

Por favor, ative os especialistas:

1. QA Engineer: ajude a reproduzir e documentar o bug.
   Identifique casos relacionados que podem ter o mesmo problema.

2. (Após reprodução) Diagnóstico:
   - Identifique a causa raiz (não o sintoma)
   - Use os 5 Porquês

3. Vanilla JS Engineer ou Supabase Specialist:
   - Implemente a correção MÍNIMA para o problema
   - Escreva o teste que reproduz o bug ANTES de corrigir

4. Security Reviewer: (se bug de auth/dados)

5. Code Reviewer: revise a correção

Siga o workflow em workflows/bug.md
```

---

## Skills Ativadas

| Especialista | Quando |
|---|---|
| QA Engineer | Reprodução e documentação |
| Vanilla JS Engineer | Bug no frontend |
| Supabase Specialist | Bug no backend/banco |
| Security Reviewer | Bug de segurança |
| PostgreSQL Performance | Bug de performance |
| Code Reviewer | Revisão da correção |

---

## Entregáveis Esperados

- [ ] Bug reproduzido e documentado
- [ ] Causa raiz identificada
- [ ] Teste que reproduz o bug (antes da correção)
- [ ] Correção mínima implementada
- [ ] Teste passando após correção
- [ ] Todos os outros testes passando
- [ ] Code review aprovado
- [ ] QA validou a correção
- [ ] Pós-mortem (para bugs críticos)
