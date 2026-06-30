# Checklist: Deploy

> Referência: workflows/deploy.md, CLAUDE.md § RO-06

---

## Pre-flight (obrigatório antes de qualquer deploy)

- [ ] CI/CD com status verde (todos os checks passando)
- [ ] Linting sem erros
- [ ] Testes automatizados passando
- [ ] Build sem erros ou warnings críticos
- [ ] `npm audit` sem vulnerabilidades críticas
- [ ] Nenhum `console.log` de debug no código
- [ ] Nenhum secret ou dado sensível no código
- [ ] `.env` não commitado

## Revisão do Conteúdo

- [ ] PR revisado e aprovado (mínimo 1 aprovação)
- [ ] Diff final revisado ("o que vai para produção?")
- [ ] CHANGELOG.md atualizado em `[Unreleased]`
- [ ] Versão do package.json atualizada (se release)

## Banco de Dados (se houver migrations)

- [ ] Migrations testadas em ambiente local
- [ ] Migrations testadas em staging
- [ ] SQL de rollback documentado e testado
- [ ] Backup do banco de produção confirmado (recente)
- [ ] Migrations aplicadas ANTES do deploy de código (não depois)
- [ ] Volume de dados da migration avaliado (< 1M linhas? pode ser online)

## Variáveis de Ambiente

- [ ] Todas as variáveis necessárias configuradas em produção
- [ ] Novas variáveis adicionadas ao `.env.example`
- [ ] Secrets configurados no Supabase Vault (não direto em env)

## Comunicação

- [ ] Time notificado sobre o deploy iminente (15 min antes)
- [ ] Horário de deploy dentro da janela permitida (10-12h ou 14-16h)
- [ ] Responsável pelo monitoramento pós-deploy identificado
- [ ] Canal de comunicação para rollback definido

## Pós-Deploy (smoke tests)

- [ ] Aplicação carrega sem erros no console do browser
- [ ] Login funciona
- [ ] Página principal renderiza corretamente
- [ ] Fluxo principal da feature deployada funciona
- [ ] Nenhum erro 500 nos logs nos primeiros 5 minutos

## Monitoramento (30 minutos após deploy)

- [ ] Taxa de erros 5xx < 0.1%
- [ ] Tempo de resposta dentro do normal
- [ ] Logs sem novos erros críticos
- [ ] Nenhum alerta de segurança disparado

## Pós-Deploy (comunicação)

- [ ] Time notificado do sucesso do deploy
- [ ] Issue/ticket atualizado
- [ ] Release notes criadas (se release maior)
