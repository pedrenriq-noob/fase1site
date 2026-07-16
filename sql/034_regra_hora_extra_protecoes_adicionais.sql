-- 034_regra_hora_extra_protecoes_adicionais.sql
-- Permite configurar, por item (proteção/adicional com tipo_preco='per_day'),
-- se a cobrança de hora extra é proporcional (regra histórica) ou integral
-- após 1h de tolerância. Ver docs/DECISION_LOG.md 2026-07-14.

alter table public.protecoes
  add column regra_hora_extra text not null default 'proporcional'
  check (regra_hora_extra in ('proporcional', 'integral_apos_tolerancia'));

alter table public.adicionais
  add column regra_hora_extra text not null default 'proporcional'
  check (regra_hora_extra in ('proporcional', 'integral_apos_tolerancia'));

comment on column public.protecoes.regra_hora_extra is
  'Regra de cobrança de hora extra (só aplicável quando tipo_preco=per_day): proporcional (fração de diária) ou integral_apos_tolerancia (diária cheia extra após 1h).';
comment on column public.adicionais.regra_hora_extra is
  'Regra de cobrança de hora extra (só aplicável quando tipo_preco=per_day): proporcional (fração de diária) ou integral_apos_tolerancia (diária cheia extra após 1h).';
