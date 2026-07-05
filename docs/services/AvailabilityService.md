# AvailabilityService — Contrato Técnico

Ver [docs/domain/AvailabilityService.md](../domain/AvailabilityService.md) para objetivo e responsabilidades.

## Assinatura

```
checkDisponibilidade(categoria: string, inicio: Date, fim: Date, veiculos: Veiculo[], reservas: Reserva[]): DisponibilidadeResult
```

JS: `calcularDisponibilidade` em `apps/frota-ops/js/services/availability.js` (após mover de `utils.js`).
TS/Deno: `checkDisponibilidade` em `supabase/functions/_shared/disponibilidade.ts`.

## Tipos

```ts
type DisponibilidadeResult = {
  disponivel: number
  total: number
  detalhes: { placa: string, modelo: string|null, disponivel: boolean, motivo: string }[]
  overbooking: boolean
  overbooking_qtd: number
  alerta: 'sem_veiculos' | 'ultimo_veiculo' | null
  reservas_conflito: ReservaConflito[]
}
```

## Comportamento garantido

- `disponivel` nunca é negativo.
- `alerta` é `null` quando `total === 0` (sem frota cadastrada), mesmo que existam reservas conflitantes — "sem dado" é tratado diferente de "estoque esgotado".
- `overbooking_qtd` reflete o excedente de reservas ativas sobre a frota da categoria no período consultado, não o total de reservas.
- Idempotente e sem efeitos colaterais: mesma entrada sempre produz a mesma saída.

## Testes de referência

`tests/disponibilidade.test.js` — parity entre as duas implementações é o critério de aceite de qualquer mudança neste contrato.
