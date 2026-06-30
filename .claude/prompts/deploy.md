# Prompt: Deploy

## Contexto

Use este prompt para preparar e executar um deploy com segurança.

---

## Prompt para o Claude

```
Preciso fazer deploy das seguintes mudanças:

Branch: [main | feature/...]
O que vai ser deployado: [descreva brevemente]
Há migrations: [sim/não - se sim, descrever]
Há mudanças em Edge Functions: [sim/não]
Janela de deploy: [horário planejado]

Por favor, execute o pre-flight checklist:

1. Verificar CI:
   - Todos os testes passando?
   - Lint sem erros?
   - Build sem warnings críticos?

2. Verificar mudanças:
   - Revisar diff final para produção
   - Verificar que não há console.log de debug
   - Confirmar variáveis de ambiente configuradas

3. Se houver migrations:
   - Confirmar que foram testadas em staging
   - Ter plano de rollback documentado
   - Backup do banco confirmado

4. Comunicação:
   - Time notificado sobre o deploy
   - Responsável pelo monitoramento definido

Execute o checklist completo em checklists/deploy.md
Siga o workflow em workflows/deploy.md
```

---

## Entregáveis Esperados

- [ ] Checklist de deploy completo e aprovado
- [ ] Backup confirmado (se houver migrations)
- [ ] Time notificado
- [ ] Deploy executado
- [ ] Smoke tests passando
- [ ] 30 minutos de monitoramento ativo
- [ ] Time notificado do sucesso
