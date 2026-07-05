# ADR-007 — Processo de Evolução Incremental do Design System

**Data:** 2026-07-05
**Status:** Aceito
**Contexto:** Consolidação do processo observado durante a Fase 0/1A do Design System Operacional (ver [ADR-006](ADR-006-design-system-operacional-ifrotas.md))

---

## Contexto

Ao longo da Fase 0 e Fase 1A do Design System Operacional, o seguinte fluxo emergiu naturalmente, sem ter sido planejado como processo formal desde o início: escrever o contrato, implementar, revisar contra o contrato, migrar uma única tela como piloto, testar de fato em ambiente real, e só então liberar para adoção mais ampla. Esse fluxo encontrou dois problemas reais que etapas anteriores não pegaram:

1. Na Architecture Validation (revisão de código), um acoplamento oculto no `ListView` e três divergências de contrato no `Modal`/`ConfirmationDialog`.
2. Na Migração Piloto (uso real em `veiculo-detalhe.js`), um bug de gerenciamento de foco no `Modal` que sobreviveu à revisão de código anterior porque só se manifestava em execução real no navegador — não era detectável por leitura de código. Isso mostrou que "migrar uma tela" e "validar em ambiente real" não são etapas sequenciais independentes, mas a mesma atividade: a migração só tem valor de validação se for de fato executada, não apenas escrita.

Sem registrar esse processo formalmente, ele depende da memória de quem o executou e corre o risco de ser abreviado sob pressão de prazo em componentes futuros.

## Decisão

Todo componente reutilizável do Design System Operacional (`docs/ui/*`) e todo serviço de domínio (`docs/domain/*`/`docs/services/*`) deve percorrer obrigatoriamente o seguinte ciclo antes de ser considerado consolidado:

1. **Contrato aprovado** — especificação em `docs/ui/`/`docs/domain/`/`docs/services/` revisada e aprovada antes de qualquer código.
2. **Implementação** — código que implementa exatamente o contrato, sem métodos públicos extras, sem lógica de negócio.
3. **Code Review Arquitetural** — revisão específica de aderência ao contrato (não uma revisão de código genérica), usando `docs/ui/COMPONENT_CHECKLIST.md` como guia. Cobre correção, segurança e aderência ao contrato na mesma passada — não são duas reuniões separadas, são duas lentes do mesmo review.
4. **Migração Piloto validada em ambiente real** — adoção por exatamente uma tela real, testada de fato em execução (navegador ou equivalente), não apenas por leitura de código ou teste automatizado isolado. Estas duas atividades (adotar e validar) são inseparáveis na prática — a Migração Piloto de `veiculo-detalhe.js` (2026-07-05) mostrou que "migrar" sem "testar em execução" não teria pego o bug de foco do `Modal`; por isso tratadas como uma única etapa, não duas.
5. **Registro das lições aprendidas** — toda migração (piloto ou subsequente) é registrada em `docs/ui/MIGRATION_LOG.md`: componentes adotados, problemas encontrados, ajustes realizados, lições aprendidas, mudanças de API.
6. **Classificação de estabilidade** — um componente só é considerado **Stable** após 3 telas adotantes sem mudança de API pública durante esse período (critério completo em `docs/ui/README.md` e `docs/ui/COMPONENT_CHECKLIST.md`).

Nenhum componente é considerado consolidado (isto é, seguro para adoção ampla sem revalidação) antes de completar as 6 etapas.

## Motivação

- O custo de encontrar um problema de contrato cedo (etapas 3-5, com 1 consumidor) é ordens de magnitude menor do que encontrá-lo depois (com múltiplos consumidores dependendo da API errada) — é o mesmo raciocínio de "testar antes de escalar" já aplicado a serviços de domínio no projeto (ex: `tests/idle-window.test.js` escrito antes de wire-up em página).
- A Migração Piloto (etapa 4) já provou valor concreto nesta sessão: encontrou um bug real que a Code Review Arquitetural (etapa 3) não encontrou.
- Formalizar em ADR evita que o processo dependa de quem o executou lembrar de repeti-lo — é o mesmo motivo pelo qual decisões arquiteturais em geral viram ADR neste projeto (RD-03).

## Consequências

**Positivas:**
- Processo repetível e auditável para qualquer componente futuro do Design System.
- Componentes "Stable" ganham uma garantia formal de estabilidade de API, permitindo que consumidores futuros confiem neles sem revalidação.
- Reduz o risco de o Design System virar, com o tempo, uma nova fonte de duplicação/inconsistência — o próprio problema que a ADR-006 existe para resolver.

**Negativas:**
- Adiciona tempo de calendário entre "componente implementado" e "componente disponível para adoção ampla" (etapas 4-6 não são instantâneas).
- Exige disciplina de registrar o `MIGRATION_LOG.md` a cada migração, mesmo quando nada de errado é encontrado (etapa 6 não é opcional só porque a etapa 5 não encontrou problemas).

## Alternativas consideradas

- **Pular a Migração Piloto e liberar componentes para adoção geral assim que a Code Review Arquitetural aprovar** — rejeitado com evidência concreta: foi exatamente esse passo que encontrou o bug de foco do `Modal` nesta sessão; pular a etapa teria propagado o bug para múltiplas telas antes de ser detectado.
- **Formalizar o processo só depois de mais componentes serem construídos** (esperar mais experiência antes de documentar) — rejeitado a pedido do Product Owner: o objetivo declarado é que o processo não dependa de memória, e quanto mais componentes passarem sem o processo formal, maior o risco de inconsistência entre eles.
