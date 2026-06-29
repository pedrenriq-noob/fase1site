# ADR-001 — Vanilla JS sem framework frontend

**Data:** 2026-01-01  
**Status:** Aceito  
**Contexto:** Sistema de reservas web multi-step (Fase 1 site)

---

## Contexto

O sistema de reservas precisava de um frontend interativo com múltiplos passos, validação em tempo real, integração com Supabase e suporte a extensão de navegador. Precisávamos decidir se usaríamos um framework (React, Vue, Svelte) ou JavaScript puro.

## Decisão

Adotar **JavaScript puro (vanilla JS)** sem nenhum framework frontend.

## Motivação

- O site é entregue como arquivo estático — zero build step, zero bundler, deploy imediato no Vercel
- A extensão de navegador que se injeta na página de terceiros não pode depender de um runtime de framework
- O payload total de JS precisa ser mínimo para performance em conexões móveis
- A equipe de manutenção não tem garantia de conhecimento de frameworks específicos; JS puro é universal
- A complexidade de estado do formulário multi-step é gerenciável com um objeto `S` centralizado (padrão escolhido)

## Consequências

**Positivas:**
- Bundle < 50KB, sem dependências de terceiros em runtime
- Nenhum processo de build — mudanças em `script.js` vão direto para produção
- Reutilização direta de código entre site e extensão

**Negativas:**
- Reatividade manual via `renderStep1(c)` em vez de reatividade declarativa
- Sem type-checking — disciplina de nomes de variáveis é obrigatória
- Funções de render tendem a crescer (monitorar violação de BP-02)

## Alternativas consideradas

- **React**: rejeitado — build step obrigatório, bundle > 100KB, incompatível com extensão
- **Svelte**: rejeitado — ainda requer compilação, curva de aprendizado adicional
- **Alpine.js**: avaliado — mas adiciona dependência CDN (viola RF-09 em produção)
