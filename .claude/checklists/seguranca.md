# Checklist: Segurança

> Referência: CLAUDE.md § RSeg-*, standards/supabase.md, OWASP Top 10

---

## Autenticação e Sessão

- [ ] JWT verificado em todas as rotas protegidas
- [ ] Tokens com expiração configurada
- [ ] Refresh token implementado corretamente
- [ ] Logout limpa todos os tokens de sessão
- [ ] Rate limiting em endpoints de autenticação
- [ ] Tokens de reset de senha com expiração curta (< 1 hora)
- [ ] MFA disponível para contas privilegiadas

## Autorização (Controle de Acesso)

- [ ] RLS habilitado em TODAS as tabelas
- [ ] Ownership verificado antes de UPDATE/DELETE
- [ ] Nenhum dado de outro usuário acessível (testado!)
- [ ] Roles e permissões seguem princípio do menor privilégio
- [ ] Ações administrativas requerem verificação explícita de role
- [ ] Service role key NUNCA no código de cliente

## Inputs e Dados

- [ ] Todos os inputs validados no servidor
- [ ] `textContent` em vez de `innerHTML` para dados de usuário
- [ ] Nenhuma query SQL construída por concatenação (use parâmetros)
- [ ] Uploads validam tipo MIME e tamanho
- [ ] Uploads não sobrescrevem arquivos existentes sem verificação
- [ ] Nenhum dado sensível em query params de URL
- [ ] Nenhum dado sensível em logs ou mensagens de erro

## Configuração e Segredos

- [ ] Nenhum segredo no código fonte
- [ ] Nenhum segredo em variáveis commitadas
- [ ] Secrets no Supabase Vault
- [ ] `.env` no `.gitignore`
- [ ] `.env.example` sem valores reais

## Headers e Transporte

- [ ] HTTPS obrigatório (sem fallback HTTP)
- [ ] HSTS configurado
- [ ] Content-Security-Policy configurado
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy configurado
- [ ] CORS configurado para origins específicos (não `*`)

## Dependências

- [ ] `npm audit` sem vulnerabilidades críticas
- [ ] Dependências atualizadas regularmente
- [ ] Sem dependências de CDN não controladas em produção

## Dados Sensíveis

- [ ] Dados pessoais (CPF, RG, etc.) mascarados em logs
- [ ] Dados de cartão de crédito nunca armazenados no sistema
- [ ] Passwords nunca em texto plano (auth via Supabase)
- [ ] Dados de saúde com proteção adicional (se aplicável)
