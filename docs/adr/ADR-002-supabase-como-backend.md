# ADR-002 — Supabase como plataforma de backend

**Data:** 2026-01-01  
**Status:** Aceito  
**Contexto:** Toda a stack (Fase 1 site + Admin + I-Frotas)

---

## Contexto

O sistema precisava de banco de dados relacional, autenticação, autorização por tenant, armazenamento e funções serverless — tudo gerenciável por uma equipe pequena sem DevOps dedicado.

## Decisão

Usar **Supabase** como BaaS único para banco de dados (PostgreSQL), autenticação, RLS, Edge Functions e Storage.

## Motivação

- PostgreSQL nativo — suporte completo a transações, triggers, RLS e funções PL/pgSQL
- RLS integrado resolve autorização multi-tenant sem camada de middleware adicional
- Edge Functions em Deno permitem validações de negócio no servidor sem gerenciar infraestrutura
- Realtime via Websocket nativo — I-Frotas usa atualizações ao vivo sem polling
- Tier gratuito adequado para volume inicial; escala sem mudança de arquitetura

## Consequências

**Positivas:**
- Infraestrutura zero-ops — sem servidores para manter
- RLS garante isolamento de tenant em nível de banco (RS-01)
- Migrations versionadas via CLI do Supabase (RS-06)
- Autenticação segura sem implementação customizada (RS-03)

**Negativas:**
- Lock-in no Supabase — migrar para outro provider seria custoso
- Edge Functions têm cold start (~200ms) aceitável para o caso de uso
- Limite de rate no tier gratuito deve ser monitorado

## Alternativas consideradas

- **Firebase**: rejeitado — sem PostgreSQL real, sem suporte a JOINs, modelo de dados NoSQL inadequado para reservas relacionais
- **PlanetScale + Vercel Functions**: rejeitado — dois serviços para gerenciar, sem RLS nativo
- **Self-hosted**: rejeitado — sem equipe de infra, risco operacional alto
