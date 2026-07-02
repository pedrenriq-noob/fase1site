# ADR-003 — Algoritmo de disponibilidade por cruzamento Frota × Reservas

**Data:** 2026-03-01
**Atualizado em:** 2026-07-01 — algoritmo revisado, ver seção "Revisão 2026-07-01"
**Status:** Aceito
**Contexto:** Edge Function `check-disponibilidade` e lógica de reservas

---

## Contexto

O sistema de reservas precisa informar ao cliente quantos veículos estão disponíveis em uma categoria para um período. Havia duas abordagens: verificar por veículo individual (requer atribuição prévia) ou por pool da categoria (conta livres menos reservas sem atribuição).

## Decisão

Usar **algoritmo de pool por categoria**: disponível = total de veículos da categoria (cadastro de Frota) − reservas ativas que se sobrepõem ao período.

## Motivação

- Reservas chegam pelo site sem atribuição de placa — o operador atribui depois no I-Frotas
- Verificar por veículo individual exigiria atribuição em tempo real, o que não é o fluxo operacional
- O algoritmo de pool reflete a realidade: "temos X carros do Grupo C, Y estão comprometidos"
- Evita overbooking sem exigir pré-atribuição manual para cada reserva

## Revisão 2026-07-01 — fonte de verdade única + predição de overbooking

A versão original (2026-03-01) misturava duas fontes: status físico do veículo em `frota_veiculos` (LOCADO, NO_LAVADOR, MANUTENCAO, DEVOLVIDO sujo, com buffers de horário pós-retorno e tempo de lavador) **e** reservas sobrepostas em `frota_reservas`. Essa mistura tornava o cálculo dependente de dados operacionais atualizados manualmente (status do pátio), que nem sempre refletiam a realidade no momento da consulta.

**Decisão revisada:** a fonte de verdade passa a ser exclusivamente o **cruzamento de três datasets, todos alimentados pela aba Importação**:

1. **Frota** (CSV) — total de veículos cadastrados por categoria. Upsert por placa; é a fonte de verdade da contagem, não mais o status físico do veículo.
2. **Reservas Futuras** (CSV) — vira `frota_reservas` com `status = 'PREVISTO'` (sem placa atribuída).
3. **Contratos Abertos** (CSV) — vira `frota_reservas` com `status = 'CONFIRMADO'` (com placa atribuída).

```
total       = count(frota_veiculos WHERE tenant_id, categoria)
ocupados    = count(frota_reservas WHERE tenant_id, categoria, status IN (PREVISTO, CONFIRMADO)
                     AND período se sobrepõe à consulta)
disponivel  = max(0, total − ocupados)

overbooking       = ocupados > total
overbooking_qtd   = max(0, ocupados − total)
overbooking_categoria = categoria, se overbooking; senão null
```

Status físico do veículo (`LOCADO`/`NO_LAVADOR`/`MANUTENCAO`/`limpo`) e os buffers de horário (`calcularDisponivel`, `calcularSaidaLavador`) **continuam existindo** em `frota_veiculos` e são usados nas telas operacionais do pátio (dashboard, veículo-detalhe, movimentação), mas **não entram mais no cálculo de disponibilidade**.

**Predição de overbooking:** todo resultado de `checkDisponibilidade` (Edge Function `_shared/disponibilidade.ts`) e de `calcularDisponibilidade` (frota-ops) passa a incluir `overbooking`, `overbooking_categoria` e `overbooking_qtd`, permitindo à operação ver antecipadamente quando as reservas futuras + contratos abertos de uma categoria já superam a frota cadastrada — sem esperar a tentativa de inserir uma nova solicitação.

## Consequências

**Positivas:**
- Fonte única e auditável: qualquer divergência de disponibilidade é rastreável a um dos três CSVs importados
- Predição de overbooking explícita, antes reativa (só aparecia como erro 409 ao tentar criar uma solicitação)
- Reduz acoplamento do cálculo a dados operacionais de pátio, que mudam de forma independente e nem sempre estão atualizados

**Negativas (riscos documentados):**
- **TOCTOU race condition**: duas solicitações simultâneas para a última vaga podem ambas passar na verificação antes de qualquer insert. Mitigado por `pg_advisory_xact_lock` no RPC `inserir_solicitacao_completa` (migration 023).
- Depende da frequência de importação dos 3 CSVs — se a Frota não for reimportada após uma baixa/adição de veículo, a contagem fica desatualizada até a próxima sincronização.
- DST/fuso horário: usa offset fixo `-03:00` — se horário de verão for reintroduzido no Brasil, exigirá revisão.

## Alternativas consideradas

- **Reserva com pré-atribuição obrigatória**: rejeitado — quebra fluxo operacional; operador não sabe de antemão qual carro vai para qual cliente
- **Sem verificação de disponibilidade**: rejeitado — overbooking frequente sem visibilidade
- **Manter status físico do veículo no cálculo** (versão original): rejeitado na revisão de 2026-07-01 — decisão do usuário de usar exclusivamente o cruzamento Frota × Reservas como fonte de verdade
