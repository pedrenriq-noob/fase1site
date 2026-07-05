# Checklist: Documentação

> Referência: standards/documentacao.md, CLAUDE.md § RD-*

---

## JSDoc

- [ ] Toda função pública (exportada) tem JSDoc
- [ ] JSDoc tem `@param` para cada parâmetro com tipo e descrição
- [ ] JSDoc tem `@returns` com tipo e descrição
- [ ] JSDoc tem `@throws` para exceções lançadas
- [ ] JSDoc tem pelo menos um `@example` funcional
- [ ] Tipos customizados documentados com `@typedef`
- [ ] JSDoc está atualizado com a implementação atual

## README de Módulo

- [ ] Módulos complexos têm `README.md` no diretório
- [ ] README descreve o propósito do módulo
- [ ] Interface pública documentada
- [ ] Dependências listadas
- [ ] Configuração necessária explicada
- [ ] Exemplos de uso incluídos
- [ ] Limitações conhecidas documentadas

## ADRs

- [ ] Decisões arquiteturais significativas têm ADR
- [ ] ADR tem formato: Status, Contexto, Decisão, Consequências
- [ ] ADR está em `docs/adrs/`
- [ ] ADR referenciado onde a decisão é aplicada

## APIs e Edge Functions

- [ ] Cada Edge Function tem README no diretório
- [ ] Documentação em `docs/api/` com request/response
- [ ] Exemplos de curl ou código para chamar a API
- [ ] Códigos de erro documentados
- [ ] Autenticação necessária especificada

## CHANGELOG

- [ ] Versão `[Unreleased]` atualizada com mudanças desta feature
- [ ] Formato seguindo Keep a Changelog
- [ ] Referência a issues incluída
- [ ] Linguagem orientada ao usuário (não técnica demais)

## Comentários no Código

- [ ] Comentários explicam o "porquê", não o "o quê"
- [ ] Sem código comentado (usar git para histórico)
- [ ] TODOs têm número de issue referenciado
- [ ] Workarounds têm link para issue/bug report

## Geral

- [ ] Nenhuma documentação desatualizada (pior que ausente)
- [ ] Links são funcionais
- [ ] Exemplos de código são funcionais e testados
- [ ] Terminologia consistente com o restante do projeto
