# Template: Changelog

```markdown
# Changelog

Todas as mudanças notáveis neste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### Adicionado
- (features em desenvolvimento)

### Alterado
- (mudanças em features existentes)

### Corrigido
- (bug fixes)

---

## [{{X.Y.Z}}] — {{YYYY-MM-DD}}

### Adicionado
- {{DESCRICAO_DA_FEATURE}} (#{{ISSUE}})
- {{DESCRICAO_DA_FEATURE}} (#{{ISSUE}})

### Alterado
- {{O_QUE_MUDOU}} (#{{ISSUE}})

### Depreciado
- {{O_QUE_FOI_DEPRECIADO_E_QUANDO_SERA_REMOVIDO}}

### Removido
- {{O_QUE_FOI_REMOVIDO}} — veja [guia de migração]({{LINK}})

### Corrigido
- {{DESCRICAO_DO_BUG_CORRIGIDO}} (#{{ISSUE}})
- {{DESCRICAO_DO_BUG_CORRIGIDO}} (#{{ISSUE}})

### Segurança
- {{VULNERABILIDADE_CORRIGIDA_OU_PROTECAO_ADICIONADA}}

---

## [{{X.Y.Z-1}}] — {{YYYY-MM-DD}}

(versão anterior)

---

[Unreleased]: https://github.com/{{ORG}}/{{REPO}}/compare/v{{X.Y.Z}}...HEAD
[{{X.Y.Z}}]: https://github.com/{{ORG}}/{{REPO}}/compare/v{{X.Y.Z-1}}...v{{X.Y.Z}}
```

## Guia de Uso

### O Que Escrever em Cada Seção

**Adicionado**: novas funcionalidades que o usuário pode usar
**Alterado**: mudanças em funcionalidades existentes
**Depreciado**: features que serão removidas em futuras versões
**Removido**: features removidas nesta versão
**Corrigido**: correções de bugs
**Segurança**: mudanças relacionadas a vulnerabilidades

### Estilo de Escrita

- Escreva para o usuário, não para o desenvolvedor
- Use linguagem clara e direta
- Referencie issues e PRs para rastreabilidade
- Seja específico sobre o que mudou

### Exemplos de Entradas Boas

```
### Adicionado
- Notificações push quando o status do pedido muda (#145)
- Exportação de relatórios mensais em PDF (#167)
- Filtro por data no histórico de pedidos (#189)

### Corrigido
- Valor do pedido exibido incorretamente quando havia desconto de frete (#156)
- Login com Google falhando em Safari iOS 16 (#162)

### Segurança
- Atualizado validação de token JWT para prevenir ataques de replay (#190)
```
