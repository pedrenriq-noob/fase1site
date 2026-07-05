# Padrão: Commits

> Referência: CLAUDE.md § Convenções, Regras Obrigatórias (RO-04)

---

## Objetivo

Garantir histórico de commits legível, semântico e útil para geração de changelogs e compreensão da evolução do código.

---

## Conventional Commits

O projeto segue o padrão [Conventional Commits 1.0.0](https://www.conventionalcommits.org/).

### Formato

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé(s) opcional(is)]
```

### Tipos Permitidos

| Tipo | Quando usar | Impacto no Semver |
|---|---|---|
| `feat` | Nova funcionalidade | MINOR |
| `fix` | Correção de bug | PATCH |
| `docs` | Apenas documentação | - |
| `style` | Formatação, espaços (sem mudança de lógica) | - |
| `refactor` | Refatoração sem nova feature ou fix | - |
| `perf` | Melhoria de performance | PATCH |
| `test` | Adicionar ou corrigir testes | - |
| `build` | Sistema de build, dependências | - |
| `ci` | Configurações de CI/CD | - |
| `chore` | Outras tarefas (sem mudança de código) | - |
| `revert` | Reverter commit anterior | - |

### Modificador BREAKING CHANGE

Para mudanças incompatíveis, use `!` após o tipo ou `BREAKING CHANGE:` no rodapé:

```
feat!: remover suporte ao endpoint v1 da API

BREAKING CHANGE: O endpoint /api/v1/users foi removido.
Use /api/v2/users com o novo formato de resposta.
```

---

## Escopos

Escopos identificam a área do projeto afetada:

| Escopo | Área |
|---|---|
| `auth` | Autenticação e autorização |
| `users` | Gestão de usuários |
| `orders` | Pedidos |
| `products` | Produtos |
| `payments` | Pagamentos |
| `notifications` | Notificações |
| `db` | Banco de dados / migrations |
| `api` | Edge Functions / API |
| `ui` | Interface de usuário |
| `pwa` | Progressive Web App |
| `ci` | Pipeline de CI/CD |
| `deps` | Dependências |
| `config` | Configurações |

---

## Exemplos de Commits

### Commits Simples

```bash
# Nova feature
feat(auth): adicionar login com Google OAuth

# Correção de bug
fix(orders): corrigir cálculo de desconto para cupons percentuais

# Documentação
docs(api): adicionar exemplos de uso na Edge Function de pagamento

# Refatoração
refactor(users): extrair validação de email para módulo dedicado

# Performance
perf(db): adicionar índice em orders.user_id para queries de listagem

# Testes
test(payments): adicionar testes para processamento de estorno

# Chore
chore(deps): atualizar supabase-js para v2.39.0
```

### Commits com Corpo

```bash
feat(notifications): implementar push notifications para pedidos

Adiciona suporte a notificações push quando o status de um pedido muda.
O usuário recebe notificação automática nas transições:
- pending → processing
- processing → shipped
- shipped → delivered

Implementado usando a Web Push API com service worker dedicado.
```

### Commits com Breaking Change

```bash
feat(api)!: migrar endpoints para v2

BREAKING CHANGE: Todos os endpoints foram migrados de /api/v1/* para /api/v2/*.

Mudanças na estrutura de resposta:
- Antes: { data: {...}, status: 200 }
- Depois: { success: true, data: {...} }

Clientes devem atualizar suas integrações antes de 2024-03-01.

Closes #456
```

### Commits com Referência a Issues

```bash
fix(checkout): prevenir duplo envio de formulário de pagamento

O botão de confirmar pagamento ficava ativo durante o processamento,
permitindo que usuários clicassem múltiplas vezes e gerassem cobranças
duplicadas.

Solução: desabilitar botão e mostrar estado de loading durante request.

Fixes #789
See also: #456, #123
```

---

## Regras de Commits

### RO-04: Padrão Obrigatório

Todos os commits DEVEM seguir o padrão. O CI rejeita commits fora do formato.

### Regras Adicionais

1. **Descrição no imperativo**: "adicionar feature" não "adicionado feature" ou "adicionando feature"
2. **Sem ponto final** na descrição
3. **Máximo 72 caracteres** na linha de descrição
4. **Idioma**: título em português (exceção: nomes de código, bibliotecas)
5. **Atômico**: um commit = uma mudança lógica
6. **WIP commits** são proibidos em branches de PR

### O Que NÃO Fazer

```bash
# ERRADO: vago
git commit -m "update"
git commit -m "fix bug"
git commit -m "changes"
git commit -m "wip"

# ERRADO: múltiplas coisas no mesmo commit
git commit -m "fix auth bug, add new feature, update docs"

# ERRADO: fora do padrão
git commit -m "Added new user feature"
git commit -m "FEAT: nova feature"

# CORRETO
git commit -m "feat(users): adicionar campo de telefone ao perfil"
git commit -m "fix(auth): corrigir expiração de token de reset de senha"
```

---

## Configuração do Commitlint

```javascript
// commitlint.config.js
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'build', 'ci', 'chore', 'revert'
    ]],
    'scope-enum': [2, 'always', [
      'auth', 'users', 'orders', 'products', 'payments',
      'notifications', 'db', 'api', 'ui', 'pwa', 'ci',
      'deps', 'config'
    ]],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

### Hook Git com Husky

```bash
# Instalar husky
npm install --save-dev husky @commitlint/cli @commitlint/config-conventional

# Configurar hook
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'
```

---

## Geração de Changelog

O CHANGELOG.md é gerado automaticamente a partir dos commits:

```bash
# Gerar changelog desde a última release
npx conventional-changelog -p conventional -i CHANGELOG.md -s

# Gerar changelog desde o início
npx conventional-changelog -p conventional -i CHANGELOG.md -s -r 0
```

O CI gera o changelog automaticamente em releases.
