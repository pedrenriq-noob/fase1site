# IdleWindowService — Contrato Técnico

Ver [docs/domain/IdleWindowService.md](../domain/IdleWindowService.md) para objetivo e responsabilidades.

## Assinatura

```
identificarJanelasOciosidade(
  categoria: string,
  totalVeiculos: number,
  ocupacoes: BlocoOcupacao[],
  opts?: { agora?: Date, calcularLiberacao?: (fim: Date) => Date }
): JanelaOciosidade[]
```

Implementação: `apps/frota-ops/js/services/idle-window.js` (após mover de `js/idle-window.js`, sem mudança de lógica).

## Tipos

```ts
type BlocoOcupacao = {
  inicio: string | Date
  fim: string | Date
  origem?: 'reserva' | 'manutencao' | 'bloqueio'  // hoje só 'reserva' é populado
  referencia?: { locacao_numero?: string, cliente?: string, status?: string }
}

type JanelaOciosidade = {
  categoria: string
  veiculos_livres: number
  inicio: Date  // clipado em `agora` se a janela já estiver em andamento
  fim: Date     // = devolução máxima segura
  duracao_horas: number
}
```

## Comportamento garantido

- `veiculos_livres` nunca é `<= 0` no resultado (janelas sem capacidade livre são descartadas).
- Janelas totalmente no passado (`fim <= agora`) são descartadas; janelas em andamento são clipadas para começar em `agora`.
- O período aberto após a última ocupação conhecida nunca é reportado.
- `calcularLiberacao` (buffer), quando fornecido, afeta apenas o `inicio` de janelas cuja ocupação anterior tem `origem: 'reserva'` — nunca o `fim`.
- Segmentos contíguos com o mesmo `veiculos_livres` são mesclados em uma única janela.

## Testes de referência

`tests/idle-window.test.js` (8 casos: janela simples, buffer, overbooking, clipping temporal, merge de segmentos).
