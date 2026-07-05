// Tripwire semântico: a máquina de estados em JS (apps/intake-admin/shared/
// locacao-status.js) deve produzir exatamente o mesmo veredito do trigger
// SQL fn_validar_transicao_status (sql/008_triggers.sql), que é quem de
// fato aplica a regra — a UI só antecipa o feedback.
//
// A tabela-verdade abaixo foi gerada consultando a definição REAL em
// produção (pg_get_functiondef('fn_validar_transicao_status'::regproc))
// em 2026-07-02, não o arquivo de migration (que pode estar desatualizado
// em relação a hotfixes aplicados depois — ver memória do projeto sobre
// verificar contra o código/DB vivo).
//
// Mudou o trigger? Rode a query acima de novo e atualize esta tabela.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { transicaoValida, transicoesPossiveis, ESTADOS_FINAIS } from '../apps/intake-admin/shared/locacao-status.js'

const STATUS = ['solicitada', 'em_analise', 'confirmada', 'concluida', 'cancelada']

// Regra do trigger, reimplementada de forma independente do módulo testado
// (para não testar a função contra ela mesma):
function validoSegundoOTrigger(de, para) {
  if (['concluida', 'cancelada'].includes(de)) return de === para
  const permitidas = {
    solicitada: ['em_analise', 'confirmada', 'cancelada'],
    em_analise: ['confirmada', 'cancelada'],
    confirmada: ['concluida', 'cancelada'],
  }
  return de === para || (permitidas[de] ?? []).includes(para)
}

test('transicaoValida bate com o trigger SQL para todas as combinações de status', () => {
  for (const de of STATUS) {
    for (const para of STATUS) {
      assert.equal(
        transicaoValida(de, para),
        validoSegundoOTrigger(de, para),
        `transicaoValida('${de}', '${para}') divergiu do trigger SQL`,
      )
    }
  }
})

test('estados finais (concluida, cancelada) não aceitam nenhuma outra transição', () => {
  for (const de of ESTADOS_FINAIS) {
    for (const para of STATUS) {
      if (para === de) continue
      assert.equal(transicaoValida(de, para), false, `${de} → ${para} deveria ser inválida`)
    }
  }
})

test('transicoesPossiveis nunca oferece uma opção que o trigger rejeitaria', () => {
  for (const de of STATUS) {
    for (const para of transicoesPossiveis(de)) {
      assert.equal(validoSegundoOTrigger(de, para), true,
        `UI ofereceria ${de} → ${para}, que o trigger rejeitaria`)
    }
  }
})

test('transição direta solicitada → confirmada é permitida (hotfix de produção)', () => {
  assert.equal(transicaoValida('solicitada', 'confirmada'), true)
})
