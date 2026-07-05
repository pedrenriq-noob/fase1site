# IdleWindowService

## Objetivo

Responder: **"Existe uma oportunidade de gerar receita antes da próxima ocupação conhecida?"** — não apenas "existe um intervalo vazio?".

## Responsabilidades

- Identificar, por categoria, janelas de tempo entre uma devolução e a próxima ocupação conhecida onde há veículos livres.
- Para cada janela: quantidade de veículos livres, início, fim (= devolução máxima segura de uma locação curta), duração total, tempo máximo recomendável.
- Aplicar buffer operacional (tempo mínimo seguro pós-devolução) apenas para calcular o início efetivo da janela — nunca a disponibilidade em si.

## Entradas

- `categoria: string`
- `totalVeiculos: number`
- `ocupacoes: Array<{ inicio, fim, origem: 'reserva'|'manutencao'|'bloqueio', referencia? }>`
- `opts: { agora?: Date, calcularLiberacao?: (fim: Date) => Date }`

## Saídas

`Array<{ categoria, veiculos_livres, inicio, fim, duracao_horas }>`

## O que nunca faz

- Não altera disponibilidade, overbooking, nem contagem de veículos disponíveis do AvailabilityService.
- Não cria reservas, não bloqueia veículos, não persiste nada — função pura.
- Não reporta o período aberto após a última ocupação conhecida (isso é disponibilidade comum, não uma "oportunidade com prazo").
- Não decide a estratégia de cálculo como regra de domínio — a varredura por eventos (sweep-line) é implementação, substituível sem mudar este contrato.

## Casos de uso

- Central de Reservas identifica, hoje, quais categorias têm janela para uma locação curta.
- Operador consulta até quando pode oferecer uma locação sem comprometer a próxima reserva confirmada.
- Painel `/ociosidade` do frota-ops.

## Casos que não resolve

- "Existe disponibilidade simples para este período?" — ver AvailabilityService.
- "Este contrato tem risco de atraso?" — ver FleetWarningService (futuro).
- Fontes de ocupação além de reservas (manutenção, lavagem, vistoria, bloqueio) — o campo `origem` já existe no tipo de entrada para viabilizar isso no futuro, mas hoje só `'reserva'` é populado/consumido.

## Implementação

`apps/frota-ops/js/services/idle-window.js` (JS puro). Implementação única — único consumidor hoje é o frota-ops, já autenticado via RLS; sem necessidade de Edge Function com `service_role`. Se um segundo consumidor fora do frota-ops surgir, replicar o padrão de cópia física + teste de paridade já usado em `pricing.js`.
