# OportunidadeComercial (OportunidadeComercialService)

## Objetivo

Responder: **"quais oportunidades reais de locação existem hoje sem comprometer reservas futuras?"** — não "quais espaços livres existem na frota". É a camada de política comercial sobre as janelas geométricas que o `IdleWindowService` já identifica; existe porque a tela de Ociosidade é uma ferramenta comercial para a Central de Reservas, não uma visualização de intervalos livres (2026-07-06, requisito do Product Owner).

## Responsabilidades

- Aplicar o período consultado pelo operador (Regra 2), com default de hoje + 15 dias quando nenhum for informado (Regra 3).
- Descartar janelas com 30 horas ou menos de duração — só "mais de 30 horas" é considerada oportunidade (Regra 1).
- Recortar a janela pelo horário de funcionamento real do local associado ao pátio dos veículos (Regra 5) — nunca fixo no código, vem de `locais` via `frota_patios.locais_id`.
- Calcular a locação recomendada em diárias inteiras e a data/hora máxima de devolução, prontas para venda sem cálculo manual pelo atendente (Regras 9, 10, 11).
- Ordenar por maior duração, depois por menor início, enquanto o `SortableHeader` do Design System não for adotado nesta tela (Regra 8).

## O que nunca faz

- Não identifica as janelas geométricas — recebe do `IdleWindowService`, não duplica essa lógica.
- Não conhece Supabase, categoria de veículo específica ou reservas — opera só sobre `JanelaOciosidade[]` já prontas.
- Não altera buffer operacional nem disponibilidade — o buffer continua exclusivo do `IdleWindowService` (Regra 6), aplicado antes desta camada.

## Entradas

- `janelas: JanelaOciosidade[]` (saída do `IdleWindowService`).
- `minHoras` (default 30 — Regra 1).
- `periodoInicio`/`periodoFim` (Regra 2/3).
- `horarioLocal: {hora_retirada_inicio, hora_retirada_fim, hora_devolucao_inicio, hora_devolucao_fim, disponivel_domingo} | null` (Regra 5) — `null` = sem restrição.

## Saídas

- `Array<JanelaOciosidade & {recomendacao: {diarias, devolucaoMaxima}}>`, já filtradas e ordenadas.

## Decisão de domínio — duração mínima de locação (2026-07-06)

Não existe uma regra de duração mínima bloqueante na empresa hoje (só arredondamento de diárias, já coberto por `pricing.js`/`calcDias`). Decisão do Product Owner: `diarias = piso(horas/24)`, sem mínimo adicional além do que a Regra 1 (>30h) já garante — não há necessidade de replicar `calcDias` aqui, já que o objetivo é recomendar diárias inteiras vendáveis, não calcular cobrança fracionada.

## Decisão de arquitetura — local de referência para horário de funcionamento (2026-07-06)

`frota_patios` (pátio onde o veículo fisicamente está, `frota_veiculos.patio_atual`) e `locais` (horários de funcionamento, hoje só consumidos pelo site público de cotação) eram tabelas sem nenhuma ligação — os nomes cadastrados em cada uma não correspondem entre si (ver `sql/031_locais_id_frota_patios.sql`). Foi adicionada uma FK nullable `frota_patios.locais_id`, populada manualmente pelo operador na tela Admin > Pátios — **sem inferência automática de nomes**, por não haver correspondência confiável.

Como o `IdleWindowService` opera em modelo de pool (N veículos livres de uma categoria, sem rastrear qual veículo específico está em qual pátio), o horário aplicado a uma janela usa o pátio dos veículos **hoje `DISPONIVEL`** daquela categoria: se todos compartilham o mesmo local vinculado (ou nenhum tem vínculo), esse horário é aplicado; se há mais de um local distinto entre eles, a opção conservadora é **não aplicar nenhuma restrição** (nunca esconder uma oportunidade real por ambiguidade de qual horário vale). Limitação conhecida, documentada em `docs/ui/MIGRATION_LOG.md` — hoje irrelevante na prática porque nenhum pátio tem `locais_id` preenchido ainda.

## Casos de uso

- `ociosidade.js` — único consumidor até o momento.

## Casos que não resolve

- Não decide disponibilidade agregada da frota (ver AvailabilityService).
- Não identifica as janelas (ver IdleWindowService).
- Não atribui veículo/placa específica à oportunidade (modelo de pool, mesma limitação do IdleWindowService).
