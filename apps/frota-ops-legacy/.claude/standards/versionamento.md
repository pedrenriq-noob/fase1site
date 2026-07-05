# Padrão: Versionamento

> Referência: CLAUDE.md § Convenções, Framework Evolution.md

---

## Objetivo

Definir a estratégia de versionamento semântico, gestão de branches, criação de releases e manutenção do changelog.

---

## Versionamento Semântico (SemVer)

O projeto segue [Semantic Versioning 2.0.0](https://semver.org/lang/pt-BR/).

### Formato: MAJOR.MINOR.PATCH

```
1.4.2
│ │ └── PATCH: bug fixes compatíveis com versões anteriores
│ └──── MINOR: novas funcionalidades compatíveis com versões anteriores
└────── MAJOR: mudanças incompatíveis (breaking changes)
```

### Regras de Incremento

| Situação | Versão | Exemplo |
|---|---|---|
| Breaking change (remove ou altera API existente) | MAJOR | 1.x.x → 2.0.0 |
| Nova feature (sem quebrar nada) | MINOR | x.1.x → x.2.0 |
| Bug fix (sem nova feature) | PATCH | x.x.1 → x.x.2 |
| Apenas docs, CI, refactor sem mudança de comportamento | PATCH | x.x.1 → x.x.2 |

### Versão Zero (0.x.y)

Durante desenvolvimento inicial (v0.x.y):
- `0.MINOR.PATCH`
- MINOR pode conter breaking changes (API ainda não estável)
- PATCH: fixes apenas
- A API é considerada estável a partir de v1.0.0

---

## Estratégia de Branches

### Branches Principais (Protegidas)

```
main ────────────────────────────────────────────► (sempre deployável)
  │                                  ▲
  │                                  │ merge via PR
  └─► staging ──────────────────────►│ (ambiente de homologação)
```

### Branches de Trabalho

```
Nomenclatura: <tipo>/<issue-número>-<descrição-curta>

Tipos:
- feature/   → nova funcionalidade
- fix/        → correção de bug
- refactor/   → refatoração
- docs/       → apenas documentação
- chore/      → tarefas de manutenção
- hotfix/     → correção urgente em produção

Exemplos:
- feature/123-adicionar-login-google
- fix/456-corrigir-calculo-desconto
- hotfix/789-vulnerabilidade-auth
- docs/012-atualizar-readme-deploy
```

### Fluxo de Branches

```
main
  └── feature/123-nova-feature
        ├── commits de desenvolvimento
        └── PR → review → merge para main
                              └── CI/CD → deploy automático

Hotfix (urgente):
main
  └── hotfix/789-bug-critico
        └── PR → revisão expres → merge para main
                                    └── tag de release
```

---

## Processo de Release

### 1. Pré-Release Checklist

```bash
# Verificar que todos os testes passam
npm test

# Verificar que não há vulnerabilidades críticas
npm audit --audit-level=critical

# Atualizar CHANGELOG.md
npx conventional-changelog -p conventional -i CHANGELOG.md -s

# Revisar mudanças desde última release
git log v1.2.0..HEAD --oneline
```

### 2. Versionar o Pacote

```bash
# Para PATCH (bug fixes)
npm version patch -m "chore(release): v%s"

# Para MINOR (nova feature)
npm version minor -m "chore(release): v%s"

# Para MAJOR (breaking changes)
npm version major -m "chore(release): v%s"

# Isso automaticamente:
# 1. Atualiza version no package.json
# 2. Cria commit de versão
# 3. Cria tag git
```

### 3. Push com Tags

```bash
git push origin main --tags
```

### 4. GitHub Release

```bash
# Via GitHub CLI
gh release create v1.3.0 \
  --title "v1.3.0 — Nome da Feature Principal" \
  --notes-file CHANGELOG_CURRENT.md
```

---

## Manutenção do CHANGELOG

### Formato — Keep a Changelog

```markdown
# Changelog

Todas as mudanças notáveis do projeto são documentadas aqui.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).
Versões seguem [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
- (features em desenvolvimento que ainda não foram lançadas)

## [1.3.0] — 2024-03-15

### Adicionado
- Login com Google OAuth (#123)
- Notificações push para mudanças de status de pedido (#145)
- Exportação de relatórios em PDF (#167)

### Alterado
- Melhorado tempo de carregamento do dashboard em 40% (#178)
- Atualizado layout do perfil do usuário (#189)

### Corrigido
- Cálculo incorreto de desconto para cupons percentuais (#156)
- Token de reset de senha expirando antes do prazo (#162)

### Segurança
- Atualizado dependências com vulnerabilidades CVE-2024-1234 (#190)

## [1.2.1] — 2024-02-28

### Corrigido
- Crash na página de checkout em Safari iOS (#151)

## [1.2.0] — 2024-02-15

### Adicionado
- Suporte a pagamento via PIX (#134)

### Removido
- Endpoint /api/v1/users (migrado para v2) — ver guia de migração

[Unreleased]: https://github.com/org/repo/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/org/repo/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/org/repo/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/org/repo/compare/v1.1.0...v1.2.0
```

### Regras do Changelog

1. **Atualizado a cada PR**: o autor inclui a entrada no `## [Unreleased]`
2. **Escrito para usuários**: não para desenvolvedores (use linguagem de produto)
3. **Agrupa por tipo**: Adicionado, Alterado, Depreciado, Removido, Corrigido, Segurança
4. **Referencia issues**: inclua o número da issue para rastreabilidade
5. **Data ISO**: use formato YYYY-MM-DD

---

## Suporte a Versões

| Versão | Status | Suporte |
|---|---|---|
| 2.x (atual) | Ativo | Bugs + Security |
| 1.x | Manutenção | Apenas Security |
| 0.x | EOL | Sem suporte |

### Política de Suporte

- **Versão atual (latest major)**: bugs e security patches
- **Versão anterior**: apenas security patches por 6 meses após nova major
- **Versões mais antigas**: sem suporte (usuários devem migrar)

---

## Versioning de APIs

### URLs Versionadas

```
/api/v1/users    ← Deprecated após v2 lançar
/api/v2/users    ← Versão atual
```

### Headers de Versão

```http
X-API-Version: 2
Deprecation: true
Sunset: Mon, 01 Jan 2025 00:00:00 GMT
Link: <https://docs.exemplo.com/migration-v2>; rel="deprecation"
```

### Política de Deprecação

1. Anunciar deprecação com mínimo 3 meses de antecedência
2. Manter versão antiga funcionando durante o período de transição
3. Logs de aviso para chamadas à versão depreciada
4. Remover apenas após o prazo anunciado
