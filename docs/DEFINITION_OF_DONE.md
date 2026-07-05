# Definition of Done — i-Frotas

Critério objetivo para considerar qualquer entrega concluída. Não substitui os checklists específicos já existentes — consolida os mínimos que se aplicam em qualquer contexto, para não depender de interpretação individual.

## Componente do Design System (`docs/ui/*`, `docs/domain/*`, `docs/services/*`)

Segue o ciclo obrigatório da [ADR-007](adr/ADR-007-processo-evolucao-design-system.md), verificado item a item pelo [COMPONENT_CHECKLIST.md](ui/COMPONENT_CHECKLIST.md). Um componente está **Done** quando:

1. Contrato documentado existe e foi aprovado antes do código.
2. Implementação bate exatamente com o contrato (sem métodos públicos extras, sem lógica de negócio, sem import de serviço de domínio).
3. Code Review Arquitetural realizado e sem pendências.
4. Migração Piloto realizada em pelo menos uma tela real, validada em execução de fato (navegador ou equivalente) — não só por leitura de código.
5. Entrada correspondente registrada em `docs/ui/MIGRATION_LOG.md`.
6. `npm test` continua 100% (nenhuma regressão).

**Não** é critério de Done: ser Stable (3 telas). Stable é um estágio posterior de maturidade, não um requisito para a primeira entrega.

## Funcionalidade de produto (feature nova, correção de bug)

Uma entrega está **Done** quando:

1. Implementa exatamente o que foi pedido — nem menos, nem funcionalidade extra não solicitada.
2. `npm test` continua 100%.
3. Verificada em execução real quando a mudança é observável (navegador, para UI; curl/consulta direta, para dados/API) — não apenas por leitura de código.
4. Sem segredos, credenciais ou dado sensível no código ou nos logs.
5. Commit criado com mensagem descrevendo o quê e o porquê; push só após autorização explícita do usuário para a ação específica.
6. Toda decisão pequena tomada durante a implementação que não justificasse uma ADR está registrada em [DECISION_LOG.md](DECISION_LOG.md).

## Documentação / ADR

Uma ADR ou documento de arquitetura está **Done** quando:

1. Contexto, decisão, motivação e consequências estão explícitos (não só a decisão).
2. Alternativas consideradas e rejeitadas estão registradas com o motivo da rejeição.
3. Referenciado a partir de qualquer documento que dependa dele (ex: `docs/ui/README.md` aponta para a ADR-006/007).
