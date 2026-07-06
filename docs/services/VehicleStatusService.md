# VehicleStatusService — Contrato Técnico

Ver [docs/domain/VehicleStatus.md](../domain/VehicleStatus.md) para objetivo, responsabilidades e a decisão de domínio sobre transições fora do fluxo oficial. Ver [docs/domain/CicloVidaVeiculo.md](../domain/CicloVidaVeiculo.md) para a referência funcional do ciclo de vida.

**Status:** especificação aprovada em 2026-07-05, implementação autorizada.

## Assinatura

```
descreverTransicao(
  statusAtual: VehicleStatusValue,
  statusDestino: VehicleStatusValue,
  contexto?: {
    patioAtual?: string,
    pontoRetirada?: string,
    pontoRetorno?: string,
    prevRetorno?: string | null,
    horaEntradaLavador?: string
  }
): TransicaoResult
```

## Tipos

```ts
type VehicleStatusValue = 'DISPONIVEL' | 'LOCADO' | 'DEVOLVIDO' | 'NO_LAVADOR' | 'MANUTENCAO'

type TransicaoResult =
  | { valido: true, payload: Partial<Veiculo> }
  | { valido: false, motivo: string }
```

## Revisão de contrato de 2026-07-05 (antes de qualquer implementação) — decisões de domínio

Esta versão substitui a original, revisada criticamente antes de codar. Mudanças, todas decididas explicitamente pelo Product Owner (não assumidas):

1. **`contexto.limpo` removido** — nenhuma transição documentada o lia; o serviço determina `limpo` sozinho, a partir da própria transição. A interface nunca envia esse valor.
2. **`contexto.patioDestino` removido** — movimentação de pátio não é transição de status; fica fora do escopo deste serviço (candidato a um serviço futuro dedicado a movimentação de pátio).
3. **`contexto.patioAtual` adicionado** — necessário para `NO_LAVADOR → DISPONIVEL` decidir o pátio de destino.
4. **`contexto.pontoRetirada` adicionado** — necessário para `DISPONIVEL → LOCADO`.
5. **`contexto.prevRetorno` adicionado** (opcional/nulo) — necessário para `DISPONIVEL → LOCADO`.
6. **Transições fora da tabela abaixo são inválidas** — decisão de domínio: só o fluxo operacional oficial é aceito, `valido: false` para qualquer par não listado (ver `docs/domain/VehicleStatus.md`).
7. **`horaEntradaLavador` passa a ser obrigatório** para `DEVOLVIDO → NO_LAVADOR` (não mais opcional) — o serviço nunca gera timestamp internamente; quem chama fornece.

## Tabela de transições válidas (única fonte — qualquer par fora daqui é `valido: false`)

| statusAtual | statusDestino | Contexto obrigatório | Payload |
|---|---|---|---|
| `LOCADO` | `DEVOLVIDO` | `pontoRetorno` | `{ status: 'DEVOLVIDO', limpo: false, patio_atual: pontoRetorno, ponto_retorno: pontoRetorno }` |
| `DEVOLVIDO` | `NO_LAVADOR` | `horaEntradaLavador` | `{ status: 'NO_LAVADOR', hora_entrada_lavador: horaEntradaLavador, patio_atual: 'Lavador' }` |
| `DEVOLVIDO` | `DISPONIVEL` | — | `{ status: 'DISPONIVEL', limpo: true }` |
| `NO_LAVADOR` | `DISPONIVEL` | `patioAtual` | `{ status: 'DISPONIVEL', limpo: true, patio_atual: patioAtual === 'Lavador' ? 'Garagem' : patioAtual }` |
| `DISPONIVEL` | `LOCADO` | `pontoRetirada`, `pontoRetorno` (`prevRetorno` opcional, `null` se ausente) | `{ status: 'LOCADO', limpo: true, patio_atual: null, ponto_retirada: pontoRetirada, ponto_retorno: pontoRetorno, prev_retorno: prevRetorno ?? null }` |
| `DISPONIVEL` \| `LOCADO` \| `DEVOLVIDO` \| `NO_LAVADOR` | `MANUTENCAO` | — | `{ status: 'MANUTENCAO' }` |
| `MANUTENCAO` | `DISPONIVEL` | — | `{ status: 'DISPONIVEL', limpo: true }` |

Qualquer outro par (`statusAtual`, `statusDestino`), incluindo `statusAtual === statusDestino`: `{ valido: false, motivo: 'Transição não prevista no fluxo operacional.' }`.

Se o contexto obrigatório de uma transição válida estiver ausente: `{ valido: false, motivo: '<campo> é obrigatório para esta transição.' }`.

## Comportamento a garantir

- `updated_at`/`updated_by` são responsabilidade da página (dependem de sessão/timestamp no momento da escrita), não do serviço.
- Função pura: mesma entrada sempre produz a mesma saída; nenhum acesso a relógio, rede, ou estado externo.

## Testes a criar

`tests/vehicle-status.test.js` — tabela-verdade cobrindo: as 7 transições válidas com contexto completo; cada uma com contexto obrigatório faltando (deve invalidar); pelo menos 3 pares fora da tabela (deve invalidar); o caso `statusAtual === statusDestino` (deve invalidar). Mesmo padrão de `tests/locacao-status.test.js`, antes de qualquer página passar a depender deste serviço.
