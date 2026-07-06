# OportunidadeComercialService — Contrato Técnico

Implementação: `apps/frota-ops/js/services/oportunidade-comercial.js`
Testes: `tests/oportunidade-comercial.test.js`
Domínio: `docs/domain/OportunidadeComercial.md`

## Assinatura

```ts
function filtrarOportunidadesComerciais(
  janelas: JanelaOciosidade[],
  opts?: {
    minHoras?: number,               // default 30 — Regra 1, filtro é ">" (estrito), não ">="
    periodoInicio?: Date | null,     // Regra 2/3
    periodoFim?: Date | null,        // Regra 2/3
    horarioLocal?: {
      hora_retirada_inicio: string | null,   // "HH:MM" ou "HH:MM:SS"
      hora_retirada_fim: string | null,
      hora_devolucao_inicio: string | null,
      hora_devolucao_fim: string | null,
      disponivel_domingo?: boolean          // default true
    } | null
  }
): Array<JanelaOciosidade & { recomendacao: { diarias: number, devolucaoMaxima: Date } }>
```

## Ordem de aplicação dos recortes (importante para o resultado final)

1. Recorte por período consultado (`periodoInicio`/`periodoFim`) — interseção; sem sobreposição descarta a janela.
2. Recorte por horário de funcionamento (`horarioLocal`) — início avança para a próxima retirada válida, fim retrocede para a última devolução válida anterior a esse início; se não sobrar janela positiva, descarta.
3. **Só depois dos dois recortes acima**, filtro de duração mínima (`> minHoras`) — uma janela de 40h pode cair para menos de 30h após os recortes, e nesse caso deve ser descartada (Regra 7: só oportunidades comercialmente viáveis, não geometricamente livres).
4. Cálculo de `recomendacao` sobre a janela já final.
5. Ordenação: maior `duracao_horas` primeiro; empate, menor `inicio` primeiro (Regra 8).

## Horário noturno (janela que atravessa a meia-noite)

Quando `hora_inicio > hora_fim` (ex: `"18:01"` → `"07:59"`), o horário é interpretado como um período que atravessa a meia-noite — válido das 18:01 até a meia-noite E da meia-noite até as 07:59 do dia seguinte. `disponivel_domingo: false` fecha o dia inteiro (00:00–23:59), independente do horário noturno.

## `horarioLocal: null` ou campos de hora `null`

Equivale a "sem restrição" — mesma semântica de `locais.hora_retirada_inicio IS NULL` no banco (ver `sql/010_locais.sql`). Não é tratado como erro nem gera log.

## Garantias de pureza

- Não faz I/O, não conhece Supabase.
- Não gera timestamps internos além dos derivados matematicamente da entrada (`agora`/`new Date()` não aparece neste módulo — quem decide "agora" é o `IdleWindowService`, upstream).
- Mesma entrada sempre produz a mesma saída (testado explicitamente).

## Limitação conhecida

Como a entrada é uma janela de pool (não por veículo/pátio individual), `horarioLocal` é resolvido pela página chamadora a partir do(s) pátio(s) dos veículos hoje disponíveis daquela categoria — se houver mais de um local distinto entre eles, a página passa `horarioLocal: null` (sem restrição), pois este módulo não tem informação para decidir qual horário prevalece. Ver decisão de arquitetura em `docs/domain/OportunidadeComercial.md`.
