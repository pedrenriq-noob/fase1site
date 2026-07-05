## Descrição

<!-- O que muda e por quê? Uma frase clara é suficiente. -->

## Tipo de mudança

- [ ] Bug fix
- [ ] Nova feature
- [ ] Refatoração
- [ ] Migration de banco de dados
- [ ] Documentação
- [ ] Chore / configuração

---

## Checklist do Autor

### Código
- [ ] Sem `console.log` de debug — usar `logger.*` do `utils.js` (RO-05)
- [ ] Sem segredos ou tokens no código (RO-01)
- [ ] Inputs validados na borda (RB-02)
- [ ] Dados de usuário escapados com `escapeHtml()` antes de `innerHTML` (AP-04)
- [ ] `unsubscribeAll()` chamado ao sair da página (evita leak de Realtime)
- [ ] Sem dependências circulares entre módulos (RA-06)

### Banco de dados (se aplicável)
- [ ] Migration segue padrão `YYYYMMDD_HHMMSS_descricao.sql` (RM-04)
- [ ] Toda tabela nova tem RLS habilitado (RS-01, RO-03)
- [ ] FKs novas têm índice correspondente (BP-06)
- [ ] Migration é reversível ou tem justificativa documentada (RM-02)
- [ ] EXPLAIN ANALYZE incluído para queries novas (BP-07, RR-03)

### PWA / Frontend (se aplicável)
- [ ] CSS mobile-first (RF-04)
- [ ] Sem `!important` não documentado (RF-05)
- [ ] Componentes interativos têm atributos ARIA (RF-06)
- [ ] Service Worker atualizado se novos assets foram adicionados (RP-04)

### Autenticação / Admin (se aplicável)
- [ ] Verificação de role no servidor (não apenas na UI) (EC-07)
- [ ] `clearUserCache()` chamado em mudanças de navegação que verificam role

### Documentação
- [ ] CHANGELOG.md atualizado
- [ ] ADR criado se houver decisão arquitetural significativa (RD-03)
- [ ] JSDoc nas funções públicas novas/alteradas (RD-01)

---

## Como testar

<!-- Passos para reproduzir e verificar a mudança. -->

1.
2.
3.

## Screenshots (se UI)

<!-- Cole aqui screenshots do antes/depois, se aplicável. -->
