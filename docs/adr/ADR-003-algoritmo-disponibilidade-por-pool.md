# ADR-003 — Algoritmo de disponibilidade por pool (não por veículo individual)

**Data:** 2026-03-01  
**Status:** Aceito  
**Contexto:** Edge Function `check-disponibilidade` e lógica de reservas

---

## Contexto

O sistema de reservas precisa informar ao cliente quantos veículos estão disponíveis em uma categoria para um período. Havia duas abordagens: verificar por veículo individual (requer atribuição prévia) ou por pool da categoria (conta livres menos reservas sem atribuição).

## Decisão

Usar **algoritmo de pool por categoria**: disponível = veículos fisicamente livres na categoria − reservas confirmadas sem veículo atribuído no período.

## Motivação

- Reservas chegam pelo site sem atribuição de placa — o operador atribui depois no I-Frotas
- Verificar por veículo individual exigiria atribuição em tempo real, o que não é o fluxo operacional
- O algoritmo de pool reflete a realidade: "temos X carros do Grupo C, Y estão comprometidos"
- Evita overbooking sem exigir pré-atribuição manual para cada reserva

## Lógica implementada

```
pool_disponível = veículos fisicamente livres (DISPONIVEL ou DEVOLVIDO+limpo)
  - veículos com reserva direta (placa_atribuida) no período
  - reservas no período sem placa_atribuida (consomem vagas genéricas do pool)

Considera inelegíveis: LOCADO (retorno após início), NO_LAVADOR (< 3h), MANUTENCAO
```

## Consequências

**Positivas:**
- Reflete operação real — operadores reservam pool, não placas específicas
- Previne overbooking sem bloquear o fluxo de atendimento

**Negativas (riscos documentados):**
- **TOCTOU race condition**: duas solicitações simultâneas para a última vaga podem ambas passar na verificação antes de qualquer insert. Mitigação: sistema usa aprovação manual, o operador vê ambas e confirma apenas uma. Solução definitiva documentada: `pg_advisory_xact_lock` no RPC `inserir_solicitacao_completa`.
- DST/fuso horário: usa offset fixo `-03:00` — se horário de verão for reintroduzido no Brasil, exigirá revisão

## Alternativas consideradas

- **Reserva com pré-atribuição obrigatória**: rejeitado — quebra fluxo operacional; operador não sabe de antemão qual carro vai para qual cliente
- **Sem verificação de disponibilidade**: rejeitado — overbooking frequente sem visibilidade
