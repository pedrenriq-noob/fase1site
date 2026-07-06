# Ciclo de Vida do Veículo — Referência Funcional

Este documento descreve o fluxo operacional oficial de status de um veículo na locadora, em linguagem de operação — não é o contrato técnico (ver `docs/services/VehicleStatusService.md` para isso). Use esta referência sempre que uma nova transição de status for discutida, antes de qualquer alteração no `VehicleStatusService`.

## Fluxo principal

```
DISPONIVEL
    │  (sai para locação)
    ▼
 LOCADO
    │  (cliente devolve o veículo)
    ▼
DEVOLVIDO
    │  (enviado para lavagem)
    ▼
NO_LAVADOR
    │  (lavagem concluída)
    ▼
DISPONIVEL
```

## Ramificação: manutenção

Qualquer status do fluxo principal (`DISPONIVEL`, `LOCADO`, `DEVOLVIDO`, `NO_LAVADOR`) pode ir para `MANUTENCAO` a qualquer momento — um veículo pode precisar de manutenção em qualquer ponto da operação, não só quando disponível.

```
DISPONIVEL ─┐
LOCADO ─────┼──→ MANUTENCAO ──→ DISPONIVEL
DEVOLVIDO ──┤       (manutenção concluída)
NO_LAVADOR ─┘
```

## O que este fluxo representa

Estas são as **únicas** transições que o `VehicleStatusService` considera válidas — qualquer combinação fora deste diagrama (ex: `LOCADO` direto para `NO_LAVADOR`, sem passar por `DEVOLVIDO`) é recusada pelo serviço, por decisão de domínio de 2026-07-05: o serviço representa o fluxo operacional oficial da locadora, não um mecanismo genérico e permissivo.

Isso não significa que o operador seja impedido de agir rápido na interface — significa que qualquer ação de status na interface, não importa em qual tela, corresponde sempre a um desses passos oficiais. Se uma situação real exigir pular esse fluxo (ex: correção administrativa de um cadastro inconsistente), isso deve passar por um mecanismo administrativo explícito e separado, nunca pelo caminho normal de operação.

## Quando revisar este documento

Sempre que:
- uma nova transição de status parecer necessária durante o desenvolvimento de uma funcionalidade nova;
- a operação da locadora mudar de forma que este fluxo deixe de representar a realidade (ver também a Auditoria de Domínio em `docs/governance/plano-auditorias-estrategico.md`);
- um novo status de veículo for cogitado (ex: um status intermediário que hoje não existe).

Qualquer mudança neste fluxo é uma decisão de domínio — não deve ser feita por suposição durante a implementação de outra funcionalidade.
