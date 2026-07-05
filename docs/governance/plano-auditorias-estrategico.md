# Plano Estratégico de Auditorias — i-Frotas

Aprovado pelo Product Owner em 2026-07-05, após a Technical Audit geral (ver `docs/DECISION_LOG.md` e a memória de sessão correspondente). Nenhuma auditoria deste plano deve ser executada preventivamente — cada uma só é acionada quando seu gatilho ocorrer. Este documento existe para não depender de memória entre sessões sobre por que cada auditoria existe e quando faz sentido rodá-la.

## Categorias

Toda auditoria deste plano pertence a exatamente uma categoria, que explica sua razão de existir:

- **Preventiva** — evita um problema que ainda não aconteceu, mas que se tornaria caro se descoberto tarde (ex: postura de segurança, configuração de infraestrutura).
- **Reativa** — responde a um sintoma real já observado ou a um risco que se tornou concreto (ex: performance sob volume real, incidente de produção).
- **Evolutiva** — acompanha o crescimento do produto, quando uma decisão anterior (Design System, um módulo novo) precisa ser reavaliada à luz do que realmente aconteceu depois dela.

## Princípio permanente

Este plano segue o mesmo princípio já aplicado ao Design System (ADR-006/007) e ao Decision Log: evoluir com base em evidência e gatilho real, nunca por antecipação. Uma auditoria "preventiva" não é uma exceção a essa regra — ela é preventiva porque o *custo de esperar* é conhecido e alto (ex: descobrir um limite de plano do Supabase em produção), não porque "pode ser bom fazer algum dia".

---

## 1. Auditoria de Domínio

**Categoria:** Evolutiva

**Objetivo:** validar se as regras de negócio registradas no código e na documentação (`docs/domain/`) continuam representando corretamente a operação real da locadora. Não revisa código — revisa o modelo do negócio em si: descobrir regras novas, estados novos, entidades novas, ou simplificações possíveis, antes de qualquer linha de implementação.

**Escopo:** conversa/validação com quem opera o negócio (não só leitura de código), confronto entre `docs/domain/*.md` e a realidade operacional atual, identificação de regras implícitas no código que nunca foram documentadas como decisão de negócio (ex: por que `U-UTILITARIO` é tratada como exceção — isso é regra de negócio ou acidente histórico?).

**Quando executar:** sempre que um novo módulo importante for iniciado (ex: o "Workspace" mencionado pelo Product Owner) ou quando houver mudança relevante na operação da locadora (novo tipo de contrato, nova categoria de veículo, nova política comercial).

**Prioridade:** 🟡 Média — não há gatilho ativo hoje; ativa automaticamente no início de qualquer novo módulo funcional.

**Benefícios esperados:** evita construir a versão errada de uma funcionalidade por presumir uma regra de negócio que já mudou ou nunca existiu; captura entidades/estados novos antes que apareçam como retrabalho durante a implementação.

---

## 2. Auditoria de Segurança (aprofundada)

**Categoria:** Preventiva

**Objetivo:** ir além do que a Technical Audit geral já cobriu (RLS, XSS, secrets) com uma passada mais adversarial — perspectiva de atacante, não de revisor de código.

**Escopo:** dependências desatualizadas/vulneráveis, headers de segurança (CSP, HSTS, X-Frame-Options — RSeg-04), fluxo de autenticação/sessão (expiração de token, MFA para admin — RSeg-05), rate limiting em edge functions além de `criar-solicitacao`, superfície das extensões Chrome (permissões de manifest, CSP).

**Quando executar:** antes de abrir o admin/frota-ops para mais usuários externos ao time atual, ou quando o volume de uso justificar testar rate limiting/autenticação sob carga real.

**Prioridade:** 🟡 Média — achado crítico já foi fechado; isso é aprofundamento.

**Benefícios esperados:** postura de segurança proativa em vez de reativa, à medida que a base de usuários cresce.

---

## 3. Auditoria SQL (schema + RLS)

**Categoria:** Preventiva

**Objetivo:** revisão dedicada do modelo de dados e políticas de segurança em nível de banco, sem o ruído de código de aplicação misturado.

**Escopo:** toda a cadeia de migrations revisada como um todo coerente, constraints faltando, oportunidades de simplificação de schema, policies RLS ainda não revisadas na Technical Audit (`documentos`, `condutores_adicionais`, `translados`), consistência de nomenclatura SQL.

**Quando executar:** logo antes ou logo depois da implementação da ADR-010 (migração `categoria_id` do AvailabilityService) — momento natural em que o schema já estará sob revisão.

**Prioridade:** 🟢 Baixa-Média — nenhum achado crítico pendente; funciona mais como faxina periódica.

**Benefícios esperados:** schema mais fácil de entender para quem chegar depois; reduz o tipo de dívida que já gerou o incidente de `categoria`/`categoria_id`.

---

## 4. Auditoria de Performance

**Categoria:** Reativa

**Objetivo:** medir custo real (não estimado) de queries, payloads e renderização, com dados de uso real.

**Escopo:** `EXPLAIN ANALYZE` nas queries mais frequentes (RP-05), Core Web Vitals no site público (RP-01), tamanho de bundle real (RP-02), tempo de carregamento das listagens sem paginação sob volume real vs. projetado.

**Quando executar:** quando o volume de dados crescer o suficiente para os problemas hoje teóricos (falta de paginação, realtime recarregando tudo — dívida D4/D5 da Technical Audit) começarem a ser sentidos na prática.

**Prioridade:** 🟢 Baixa hoje, sobe conforme o volume cresce — é a auditoria mais dependente de esperar o sintoma aparecer.

**Benefícios esperados:** decisões de otimização baseadas em evidência (P6), evita implementar paginação/cache antes de precisar.

---

## 5. Auditoria de UX (medição de adoção)

**Categoria:** Evolutiva

**Objetivo:** diferente da Auditoria de UX Operacional já feita (18 princípios, matriz de aderência) — esta é uma auditoria de acompanhamento: o quanto as recomendações já feitas (Design System, ação de status onde o veículo aparece) foram de fato adotadas e mudaram o comportamento do operador.

**Escopo:** releitura da matriz de aderência original comparando com o estado atual; observação real de um operador usando o sistema, se possível; contagem de cliques de um fluxo real antes/depois.

**Quando executar:** depois que mais 1-2 telas migrarem para o Design System e pelo menos uma capacidade nova (busca global, ação em massa) for implementada.

**Prioridade:** 🟢 Baixa — a auditoria original ainda está fresca; recomendações ainda não implementadas em volume suficiente para reavaliar.

**Benefícios esperados:** confirma (ou corrige) se o investimento no Design System está reduzindo esforço operacional de fato.

---

## 6. Auditoria Operacional (rotina real do dia a dia)

**Categoria:** Evolutiva

**Objetivo:** diferente de UX (audita telas), audita fluxos de trabalho ponta a ponta — o caminho completo de uma tarefa real através de várias telas.

**Escopo:** mapear 5-10 fluxos operacionais reais e completos da Central de Reservas, contando trocas de tela, retrabalho, informação que falta em um lugar e existe em outro.

**Quando executar:** quando houver acesso a um operador real usando o sistema no dia a dia (ou logs de uso reais) — sem isso, vira suposição disfarçada de auditoria.

**Prioridade:** 🟡 Média — bloqueada por uma dependência (acesso a uso real), não por falta de valor.

**Benefícios esperados:** identifica simplificações que nenhuma auditoria de tela isolada encontraria, porque só aparecem no encadeamento entre telas.

---

## 7. Auditoria de Observabilidade

**Categoria:** Preventiva

**Objetivo:** ir além de "existe logger estruturado" (já resolvido na Ação #4 da Technical Audit) para "conseguimos diagnosticar um incidente real rapidamente".

**Escopo:** alerta automático para erro em produção (ou depende de alguém notar manualmente?), retenção de logs, central de erros (tipo Sentry) vs. só logs brutos do Supabase, rastreabilidade ponta a ponta de uma requisição, dashboards de saúde do sistema.

**Quando executar:** em breve — continuação natural e de baixo custo da Ação #4 já feita.

**Prioridade:** 🔴 **Alta** (ajustado em 2026-07-05 — não por haver problema conhecido, mas porque o sistema entra em produção contínua e uma boa capacidade de diagnóstico gera retorno alto assim que surgirem os primeiros incidentes reais; o custo de não ter isso pronto cresce rápido quanto mais o sistema for usado de verdade).

**Benefícios esperados:** reduz tempo de detecção e diagnóstico de problemas em produção.

---

## 8. Auditoria de Infraestrutura (Supabase)

**Categoria:** Preventiva

**Objetivo:** revisar a configuração da plataforma em si, não o código que roda sobre ela.

**Escopo:** connection pooling sob carga, política de backup/restore (testada? existe plano de recuperação de desastre?), limites do plano atual vs. uso projetado, configuração de Auth (expiração de sessão, providers), políticas de Storage, egress/billing.

**Quando executar:** antes de qualquer expansão significativa de uso (mais tenants, mais usuários simultâneos).

**Prioridade:** 🟡 Média — nada indica problema hoje, mas é a única área do plano inteiro nunca revisada.

**Benefícios esperados:** evita surpresa de limite de plano em produção; confirma caminho real de recuperação em caso de desastre.

---

## Resumo de prioridades (2026-07-05)

| # | Auditoria | Categoria | Prioridade |
|---|---|---|---|
| 7 | Observabilidade | Preventiva | 🔴 Alta |
| 1 | Domínio | Evolutiva | 🟡 Média (ativa por gatilho de módulo novo) |
| 2 | Segurança (aprofundada) | Preventiva | 🟡 Média |
| 6 | Operacional | Evolutiva | 🟡 Média (bloqueada por dependência) |
| 8 | Infraestrutura (Supabase) | Preventiva | 🟡 Média |
| 3 | SQL (schema + RLS) | Preventiva | 🟢 Baixa-Média |
| 4 | Performance | Reativa | 🟢 Baixa (sobe com o volume) |
| 5 | UX (medição de adoção) | Evolutiva | 🟢 Baixa |

Nenhuma destas auditorias está agendada. Este documento é consultado quando um gatilho ocorrer ou quando o Product Owner decidir priorizar uma delas manualmente.
