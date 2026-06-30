-- 026_policy_delete_frota_veiculos.sql
--
-- Mesmo bug de 025, agora em frota_veiculos: deleteVeiculo() em
-- apps/frota-ops/pages/admin.js fazia DELETE sem nenhuma policy
-- correspondente — silenciosamente não apagava nada, sem erro.

CREATE POLICY "frota_veiculos_delete" ON frota_veiculos FOR DELETE
  USING (fn_sou_admin() AND tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid()));
