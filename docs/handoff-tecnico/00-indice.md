# HANDOFF TÉCNICO COMPLETO — Ecossistema i-Frotas / Igufoz

> Documento gerado em 2026-06-30 para permitir que qualquer arquiteto de software assuma a manutenção, evolução e auditoria deste ecossistema sem depender de conversa com o desenvolvedor original.
>
> Projeto raiz: `C:\Users\User\Downloads\Fase 1\` (repositório GitHub `pedrenriq-noob/fase1site`)
> Banco de dados: Supabase, projeto `lxfnqzuzohudqwibgdic` (região us-west-2)

## Sumário

| # | Arquivo | Conteúdo |
|---|---|---|
| 1-2 | [01-visao-geral-arquitetura.md](01-visao-geral-arquitetura.md) | Visão geral do produto, arquitetura geral, diagrama de módulos |
| 3-5 | [02-fluxos.md](02-fluxos.md) | Fluxo do usuário, fluxo operacional interno, fluxo de dados |
| 6-7 | [03-fonte-verdade-dominio.md](03-fonte-verdade-dominio.md) | Fonte de verdade por entidade, modelo de domínio, diagrama ER |
| 8 | [04-banco-de-dados.md](04-banco-de-dados.md) | Todas as tabelas, colunas, índices, triggers, functions, RLS |
| 9 | [05-regras-de-negocio.md](05-regras-de-negocio.md) | Todas as regras de negócio e onde estão implementadas |
| 10-11 | [06-arquitetura-tecnica-comunicacao.md](06-arquitetura-tecnica-comunicacao.md) | Stack, estrutura de diretórios, comunicação entre módulos |
| 12 | [07-apis.md](07-apis.md) | Todos os endpoints (Edge Functions), payloads, autenticação |
| 13-14 | [08-algoritmos-upload.md](08-algoritmos-upload.md) | Upload de planilha/sync, algoritmo de disponibilidade, cálculo de preço |
| 15-18 | [09-seguranca-performance-observabilidade-escalabilidade.md](09-seguranca-performance-observabilidade-escalabilidade.md) | Segurança, performance, observabilidade, escalabilidade |
| 19-21 | [10-decisoes-divida-riscos.md](10-decisoes-divida-riscos.md) | Decisões arquiteturais (ADRs), dívida técnica, pontos frágeis |
| 22-25 | [11-dependencias-estrutura-estado-roadmap.md](11-dependencias-estrutura-estado-roadmap.md) | Dependências externas, árvore do repositório, estado atual, roadmap |
| 26-27 | [12-guia-dev-autoavaliacao.md](12-guia-dev-autoavaliacao.md) | Guia para novo desenvolvedor, autoavaliação crítica do projeto |

## Como usar este documento

Leia na ordem listada acima — cada parte assume conhecimento da anterior. Se você só precisa de uma resposta pontual (ex.: "como funciona RLS na tabela X"), vá direto à Parte 4 (Banco de Dados) ou Parte 9 (Segurança).

Todas as referências de código usam caminho relativo à raiz do repositório (`C:\Users\User\Downloads\Fase 1\`).
