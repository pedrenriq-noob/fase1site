# Prompt: Refatoração

## Contexto

Use este prompt para iniciar uma refatoração estruturada de código existente.

---

## Prompt para o Claude

```
Preciso refatorar o seguinte código/módulo:

Arquivo(s): [caminhos dos arquivos]
Problema identificado: [descreva o problema específico]
Objetivo da refatoração: [o que deve melhorar]

Métricas atuais (se disponíveis):
- Linhas de código: [X]
- Complexidade ciclomática: [X]
- Cobertura de testes: [X%]

Ative os especialistas:

1. Code Reviewer: audite o estado atual.
   Identifique todos os problemas de qualidade.

2. Software Architect: proponha a estrutura após a refatoração.
   Garanta que não há mudança de comportamento.

3. Technical Critic: questione o plano.
   Há riscos? A refatoração é necessária agora?

4. (Implementação segue após aprovação do plano)

5. QA Engineer: defina como validar que o comportamento não mudou.

Siga o workflow em workflows/refatoracao.md
Não misture refatoração com mudança de comportamento.
Garanta que há testes ANTES de começar.
```

---

## Skills Ativadas

| Especialista | Responsabilidade |
|---|---|
| Code Reviewer | Auditoria do estado atual |
| Software Architect | Design pós-refatoração |
| Technical Critic | Avaliação de riscos |
| QA Engineer | Validação de comportamento |

---

## Entregáveis Esperados

- [ ] Relatório de auditoria com métricas antes/depois
- [ ] Plano de refatoração aprovado
- [ ] Testes existentes antes de começar (> 70% cobertura)
- [ ] Commits atômicos por refatoração
- [ ] Todos os testes passando após cada commit
- [ ] Métricas documentadas após a refatoração
