# ADR-006 — Design System Operacional do i-Frotas

**Data:** 2026-07-05
**Status:** Aceito
**Contexto:** Evolução da plataforma frota-ops (auditoria de UX + arquitetura de componentes/serviços)

---

## Contexto

A auditoria de UX operacional (2026-07-05) encontrou três problemas estruturais na interface do frota-ops:

1. O mesmo componente (`createModal`) implementado de forma quase idêntica em três arquivos (`veiculo-detalhe.js`, `reservas.js`, `admin.js`).
2. O mesmo conceito (filtro de status) implementado com dois padrões visuais/comportamentais diferentes (chips em `veiculos.js`, tabs em `reservas.js`).
3. A mesma regra de negócio (mudança de status de veículo) implementada em dois lugares que podem divergir (`updateVeiculo()` em `veiculo-detalhe.js` vs. update direto em `reservas.js`).

Sem uma decisão explícita, cada nova tela tende a reimplementar pesquisa, filtro, ordenação, seleção e modais do zero, aumentando o custo de manutenção e a inconsistência de experiência a cada entrega.

## Decisão

Adotar um **Design System Operacional** do i-Frotas: um conjunto documentado e versionado de componentes de interface (`js/ui/`) e serviços de domínio (`js/services/`), com quatro regras permanentes:

1. **Contrato antes de código.** Todo componente/serviço tem uma especificação em `docs/ui/` ou `docs/domain/`/`docs/services/` (entradas, saídas, eventos, responsabilidades, regras de comportamento) escrita e revisada antes de qualquer implementação.
2. **Design System, não "biblioteca de componentes".** O conjunto define padrão de comportamento e consistência visual para toda a plataforma — uma tela não pode divergir do padrão (ex: criar seu próprio filtro) quando o componente equivalente já existe.
3. **Composabilidade sobre componentes grandes.** Prefere-se várias capacidades pequenas e combináveis (`SearchBox`, `FilterBar`, `SortableHeader`, `SelectionController`, `BulkActionBar`) a um componente monolítico que embuta tudo. `ListView` em particular permanece enxuto: orquestra essas capacidades como plugáveis, não as implementa internamente.
4. **Migração incremental, nunca reescrita.** Toda tela existente continua funcionando enquanto migra componente por componente. Nenhuma tela é reescrita inteira de uma vez.

## Motivação

- RA-04 (módulos com fronteiras claras) e RA-01 (arquitetura em camadas) já exigiam essa separação; esta ADR só a torna explícita e obrigatória para a camada de interface, que até agora não tinha um padrão formal.
- O padrão de "serviço puro sem I/O, documentado antes de implementado" já foi validado com sucesso nos serviços de domínio (`pricing.js`, `disponibilidade.ts`, `idle-window.js`) — esta ADR estende o mesmo padrão para a camada de UI.
- Composabilidade reduz o risco de repetir o erro do `ListView` "grande demais": um componente que decide fazer tudo tende a se tornar o próximo ponto de duplicação quando um caso de uso não se encaixa exatamente no que ele previu.

## Consequências

**Positivas:**
- Nova tela = compor componentes existentes, não reimplementar UI.
- Uma correção de comportamento (ex: acessibilidade de teclado no `Modal`) se propaga para todas as telas de uma vez.
- Onboarding de novo desenvolvedor mais rápido: os contratos em `docs/ui/`/`docs/domain/` descrevem o comportamento esperado sem precisar ler a implementação.

**Negativas:**
- Custo inicial de documentação e extração antes de qualquer ganho visível (Fase 0 não entrega funcionalidade nova).
- Período de transição em que telas antigas e novas convivem com padrões diferentes até a migração completa — precisa de rastreamento explícito (ver `docs/ui/README.md`, seção "Status de adoção").

## Alternativas consideradas

- **Continuar duplicando por tela conforme a necessidade aparece** — rejeitado: é exatamente o padrão que gerou os três problemas encontrados na auditoria.
- **Adotar um framework de componentes (React/Vue) só para a camada de UI** — rejeitado: contradiz ADR-001 (vanilla JS sem framework), sem justificativa nova que supere os motivos originais.
- **`ListView` monolítico com pesquisa/filtro/ordenação/seleção embutidos** — rejeitado a pedido explícito do Product Owner: prefere-se composição de capacidades pequenas a um componente que concentra muitas responsabilidades.
