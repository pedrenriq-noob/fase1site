# Template: Pull Request

```markdown
## Descrição

{{DESCRICAO_DO_QUE_FOI_FEITO_E_POR_QUE}}

Issue relacionada: #{{NUMERO_DA_ISSUE}}

## Tipo de Mudança

- [ ] Nova feature
- [ ] Correção de bug
- [ ] Refatoração (sem mudança de comportamento)
- [ ] Migration de banco de dados
- [ ] Documentação
- [ ] Configuração/CI

## Mudanças Realizadas

- {{MUDANCA_1}}
- {{MUDANCA_2}}
- {{MUDANCA_3}}

## Como Testar

1. {{PASSO_1}}
2. {{PASSO_2}}
3. {{RESULTADO_ESPERADO}}

## Capturas de Tela (se mudança visual)

| Antes | Depois |
|-------|--------|
| {{SCREENSHOT_ANTES}} | {{SCREENSHOT_DEPOIS}} |

## Checklists

### Frontend (se aplicável)
- [ ] HTML semântico
- [ ] CSS BEM mobile-first
- [ ] Acessibilidade WCAG AA
- [ ] JavaScript com ES Modules e JSDoc

### Backend (se aplicável)
- [ ] Autenticação verificada
- [ ] Inputs validados
- [ ] Erros tratados adequadamente

### Banco de Dados (se migration)
- [ ] RLS habilitado em tabelas novas
- [ ] Índices nas FKs
- [ ] Testada em staging

### Segurança (sempre)
- [ ] Nenhum segredo no código
- [ ] Dados de usuário protegidos
- [ ] Sem vulnerabilidades conhecidas

### Qualidade
- [ ] Sem `console.log` de debug
- [ ] JSDoc atualizado
- [ ] Sem código comentado
- [ ] CHANGELOG.md atualizado em [Unreleased]

## Notas Adicionais

{{NOTAS_OU_DECISOES_IMPORTANTES}}
```
