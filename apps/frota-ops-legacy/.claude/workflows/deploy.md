# Workflow: Deploy

---

## Objetivo

Garantir deploys seguros, verificados e monitorados com processo claro de rollback caso necessário.

---

## Pré-requisitos

- [ ] PR mergeado na branch `main`
- [ ] Todos os testes do CI passando
- [ ] Aprovação do tech lead (para deploys em horário comercial)
- [ ] Nenhum incidente ativo em produção

---

## Passos Detalhados

### Fase 1 — Pre-flight

**Responsável**: Developer + Tech Lead

**Passo 1.1 — Verificar o CI**
```bash
# Confirmar que todos os checks passaram
# - Linting (ESLint)
# - Testes unitários
# - Testes de integração
# - Build sem erros
# - Audit de segurança (npm audit)
```

**Passo 1.2 — Revisar o diff final**
```bash
# O que exatamente vai para produção?
git log main..HEAD --oneline
git diff production..main --stat
```

**Passo 1.3 — Verificar dependências**
- [ ] `package.json` e `package-lock.json` sincronizados
- [ ] Nenhuma dependência com vulnerabilidade crítica
- [ ] Nenhuma dependência não declarada

**Passo 1.4 — Verificar variáveis de ambiente**
- [ ] Todas as variáveis de ambiente em produção estão configuradas
- [ ] Nenhum segredo no código
- [ ] Configurações de produção corretas (URLs, chaves)

**Passo 1.5 — Verificar migrations pendentes**
```bash
supabase migration list
# Há migrations para aplicar? Se sim, aplique ANTES do deploy de código
```

**Passo 1.6 — Comunicar o time**
```
Mensagem padrão:
🚀 Deploy em 15 minutos — [lista o que vai]
Janela: HH:MM — HH:MM
Rollback disponível: Sim
Responsável: [nome]
```

**Passo 1.7 — Janela de deploy**
- **Horário preferido**: 10:00-12:00 ou 14:00-16:00 (horário comercial)
- **Evitar**: finais de semana, véspera de feriados, após 17:00
- **Para deploys urgentes (hotfix)**: qualquer horário com aprovação do tech lead

**Entregável**: Checklist de pre-flight completo

---

### Fase 2 — Build

**Responsável**: CI/CD (automatizado)

**Passo 2.1 — Build da aplicação**
```bash
# Executado automaticamente pelo CI
npm run build

# Verificações do build:
# - Zero erros de compilação
# - Sem avisos críticos
# - Bundle size dentro do orçamento (< 200KB gzipped)
```

**Passo 2.2 — Verificar artefatos**
- [ ] Build completo sem erros
- [ ] Arquivos estáticos gerados corretamente
- [ ] Service Worker atualizado (se PWA)
- [ ] Manifest.json válido

**Passo 2.3 — Análise de bundle**
```bash
# Verificar que o bundle não cresceu excessivamente
npm run build:analyze
# Documente se o bundle cresceu > 10%
```

**Entregável**: Build aprovado pelo CI

---

### Fase 3 — Deploy

**Responsável**: CI/CD (automatizado) + Developer (monitoramento)

**Passo 3.1 — Aplicar migrations (se houver)**
```bash
# SEMPRE antes do deploy de código
supabase db push --db-url $PROD_DB_URL

# Verificar que foi aplicada sem erros
supabase migration list
```

**Passo 3.2 — Deploy do código**
- CI/CD faz deploy automaticamente após merge na `main`
- Deploy das Edge Functions (se houver mudanças)
- Deploy dos arquivos estáticos

**Passo 3.3 — Deploy das Edge Functions**
```bash
# Se houver Edge Functions novas ou alteradas
supabase functions deploy nome-da-funcao --project-ref $PROJECT_REF
```

**Passo 3.4 — Invalidar cache (se necessário)**
- CDN cache para arquivos estáticos
- Service Worker cache para PWA
- Cache de API se aplicável

**Entregável**: Deploy concluído sem erros no CI/CD

---

### Fase 4 — Smoke Tests

**Responsável**: Developer + QA Engineer

**Passo 4.1 — Verificações imediatas (< 5 minutos)**
- [ ] Aplicação carrega sem erros no console
- [ ] Login funciona
- [ ] Página principal renderiza corretamente
- [ ] Sem erros 500 nos logs

**Passo 4.2 — Testes dos fluxos principais (< 15 minutos)**
- [ ] Fluxo de autenticação (login, logout, registro)
- [ ] Fluxo da feature que foi deployada
- [ ] Fluxo mais crítico do negócio
- [ ] API/Edge Functions respondem corretamente

**Passo 4.3 — Verificações de performance**
```bash
# Lighthouse em produção
npx lighthouse https://meuapp.com --output json
# LCP < 2.5s, FID < 100ms, CLS < 0.1
```

**Passo 4.4 — Verificar erros nos logs**
```bash
# No Supabase Dashboard:
# Logs > Edge Functions — verificar erros nas últimas funções
# Logs > Database — verificar erros de query
# Logs > Auth — verificar falhas de autenticação
```

**Entregável**: Smoke tests passando, nenhum erro crítico detectado

---

### Fase 5 — Monitoramento

**Responsável**: Developer (on-call)

**Passo 5.1 — Monitoramento ativo (primeiros 30 minutos)**
- Fique disponível para resolver problemas
- Monitore o dashboard de erros
- Verifique métricas de performance

**Passo 5.2 — Métricas a monitorar**
- Taxa de erros HTTP 5xx (deve ser < 0.1%)
- Tempo de resposta das Edge Functions (P95 < 500ms)
- Uso de CPU e memória do banco (se disponível)
- Número de usuários ativos (deve ser normal)

**Passo 5.3 — Critérios de rollback automático**
Inicie rollback imediatamente se:
- Taxa de erro > 5% por mais de 5 minutos
- Funcionalidade crítica completamente quebrada
- Perda de dados detectada
- Brecha de segurança identificada

**Entregável**: Deploy estável após 30 minutos de monitoramento

---

## Procedimento de Rollback

**QUANDO**: detectar problema crítico pós-deploy

```bash
# Opção 1: Reverter para commit anterior (mais seguro)
git revert HEAD
git push origin main
# CI/CD faz deploy automaticamente

# Opção 2: Para hotfix urgente específico
git push origin HEAD~1:main --force
# USAR APENAS com aprovação do tech lead

# Para reverter migration (CUIDADO - pode causar perda de dados):
# 1. Crie uma nova migration que reverte as mudanças
# 2. NUNCA delete arquivos de migration
supabase migration new revert_migration_anterior
```

**Comunicação durante rollback:**
```
🚨 ROLLBACK em andamento — [razão]
Estimativa: [tempo]
Responsável: [nome]
Atualização em: [tempo]
```

---

## Skills Envolvidas

| Fase | Skills Primárias | Skills de Apoio |
|---|---|---|
| Pre-flight | Tech Lead, Developer | Security Reviewer |
| Build | CI/CD | Developer |
| Deploy | CI/CD, Developer | Supabase Specialist |
| Smoke Tests | QA Engineer | Developer |
| Monitoramento | Developer | Tech Lead |

---

## Checklist de Deploy

Use o checklist completo em `checklists/deploy.md`.

## Critérios de Conclusão

- [ ] Pre-flight checklist 100% completo
- [ ] Build sem erros
- [ ] Migrations aplicadas com sucesso (se houver)
- [ ] Smoke tests passando
- [ ] Zero erros críticos em 30 minutos de monitoramento
- [ ] Time notificado do sucesso do deploy
- [ ] Release notes publicadas (para releases maiores)
