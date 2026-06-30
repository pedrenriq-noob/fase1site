# Prompt: Atualização de Documentação

## Contexto

Use este prompt para criar ou atualizar documentação técnica.

---

## Prompt para o Claude

```
Preciso atualizar/criar a seguinte documentação:

Tipo: [JSDoc | README de módulo | ADR | Runbook | API docs | Changelog | Onboarding]
Módulo/área: [nome do módulo ou área]
Situação atual: [não existe | desatualizada | incompleta]

O que mudou (se atualização):
[descrever o que mudou e precisa ser refletido na documentação]

Ative os especialistas:

1. Documentation Engineer: crie/atualize a documentação seguindo
   os padrões em standards/documentacao.md

2. Code Reviewer: verifique que os exemplos são funcionais e corretos

Use os templates em templates/documentacao.md
Siga o workflow em workflows/documentacao.md
```

---

## Skills Ativadas

| Especialista | Responsabilidade |
|---|---|
| Documentation Engineer | Escrita e formatação |
| Code Reviewer | Verificação de exemplos |

---

## Entregáveis Esperados

- [ ] Documentação criada/atualizada no local correto
- [ ] Exemplos de código testados e funcionando
- [ ] Links verificados
- [ ] Revisada por membro do time
- [ ] Publicada (commit + push)
