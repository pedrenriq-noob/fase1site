-- seed.sql
-- Dados iniciais da Igufoz Locadora.
-- Executar APÓS todas as migrations (001 a 009).
-- Dados extraídos do admin.js (DEFAULT_DB) em junho/2025.

-- ---------------------------------------------------------------------------
-- TENANT

INSERT INTO tenants (id, nome, whatsapp_central, plano, ativo)
VALUES (
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Igufoz Locadora',
    '5545988182995',
    'basic',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Variável local para reusar o tenant_id neste script
DO $$
DECLARE
    v_tenant uuid := 'a1b2c3d4-0000-0000-0000-000000000001';
BEGIN

-- ---------------------------------------------------------------------------
-- CATEGORIAS (extraídas de DEFAULT_DB.categories no admin.js)

INSERT INTO categorias (tenant_id, slug, nome, descricao, preco_diaria, transmissao, max_pessoas, max_cadeirinhas, quantidade_frota, ordem, ativo)
VALUES
    (v_tenant, 'grupo_b', 'GRUPO B', 'Hatch Compacto - Manual (Mobi, C3 ou similar): Compactos, econômicos e ágeis, perfeitos para o dia a dia na cidade.', 167.90, 'manual', 5, 2, 1, 1, true),
    (v_tenant, 'grupo_c', 'GRUPO C', 'Hatch Médio - Manual (Onix, Argo, 208, Polo ou similar): Modernos e confortáveis, com mais espaço e desempenho.', 182.93, 'manual', 5, 2, 1, 2, true),
    (v_tenant, 'grupo_d', 'GRUPO D+', 'Sedan Automático (Cronos ou similar): Condução suave e conforto para o dia a dia.', 249.96, 'automatico', 5, 2, 1, 3, true),
    (v_tenant, 'grupo_f', 'GRUPO F', 'SUV Mini Automático (Tera, Pulse ou similar): Robusto e tecnológico, ideal para a tríplice fronteira.', 273.95, 'automatico', 5, 2, 1, 4, true),
    (v_tenant, 'grupo_i', 'GRUPO I', 'Sedan Médio Automático (Virtus, Onix Plus ou similar): Design moderno e tecnologia embarcada.', 289.90, 'automatico', 5, 2, 1, 5, true),
    (v_tenant, 'grupo_g', 'GRUPO G', 'SUV Médio Automático (2008, Fastback ou similar): Versátil, com espaço e desempenho para qualquer passeio.', 369.90, 'automatico', 5, 2, 1, 6, true),
    (v_tenant, 'grupo_j', 'GRUPO J', 'SUV Premium Automático (Tiggo 5x ou similar): Acabamento refinado e tecnologia de ponta.', 402.93, 'automatico', 5, 2, 1, 7, true),
    (v_tenant, 'grupo_h', 'GRUPO H (7 LUGARES)', '7 Lugares Automático (Spin ou similar): Amplo e confortável para até 7 passageiros.', 496.98, 'automatico', 7, 4, 1, 8, true)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- PROTEÇÕES (extraídas de DEFAULT_DB.protections no admin.js)

INSERT INTO protecoes (tenant_id, nome, descricao, preco, tipo_preco, franquia, pre_autorizacao, ordem, ativo)
VALUES
    (v_tenant,
     'PROTEÇÃO A TERCEIROS',
     'Cobertura: danos materiais ou pessoais causados a terceiros. Participação obrigatória: R$ 1.200,00 (em caso de sinistro). Pré-autorização: R$ 20.000,00. Recomendado para: quem utiliza a proteção do cartão de crédito.',
     29.90, 'per_day', 'R$ 1.200,00', 20000.00, 1, true),

    (v_tenant,
     'PROTEÇÃO PARCIAL + TERCEIROS',
     'Cobertura: colisão, furto, roubo, incêndio, perda total e danos a terceiros. Participação obrigatória: até 20% do valor FIPE do veículo. Pré-autorização: entre R$ 1.200,00 e R$ 2.000,00.',
     65.90, 'per_day', 'até 20% do valor FIPE', 2000.00, 2, true),

    (v_tenant,
     'PROTEÇÃO PLUS + TERCEIROS',
     'Cobertura: colisão, furto, roubo, incêndio, perda total e danos a terceiros. Participação obrigatória: até 10% do valor FIPE do veículo. Pré-autorização: entre R$ 1.200,00 e R$ 2.000,00.',
     87.00, 'per_day', 'até 10% do valor FIPE', 2000.00, 3, true)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- ADICIONAIS (extraídos de DEFAULT_DB.additionals no admin.js)

INSERT INTO adicionais (tenant_id, nome, descricao, preco, tipo_preco, permite_quantidade, is_cadeirinha, estoque, ordem, ativo)
VALUES
    -- Cadeirinhas (is_cadeirinha=true, estoque definido em DEFAULT_SETTINGS.stock)
    (v_tenant, 'BEBÊ CONFORTO',             '0 a 1 ano | até 13 kg',            30.00, 'per_day', true,  true,  5,    1, true),
    (v_tenant, 'CADEIRINHA INFANTIL',        '1 a 4 anos | 9 a 18 kg',           30.00, 'per_day', true,  true,  9,    2, true),
    (v_tenant, 'ASSENTO DE ELEVAÇÃO',        '4 a 7,5 anos | 15 a 36 kg',        30.00, 'per_day', true,  true,  7,    3, true),

    -- Travessia / Carta Verde
    (v_tenant, 'Aut. Travessia + CV 3d',    'Autorização de travessia com Carta Verde de 3 dias para o Mercosul.',   125.00, 'fixed', false, false, null, 4, true),
    (v_tenant, 'Aut. Travessia + CV 7d',    'Autorização de travessia com Carta Verde de até 7 dias para o Mercosul.', 190.00, 'fixed', false, false, null, 5, true),

    -- Serviços
    (v_tenant, 'DEVOLUÇÃO NO AEROPORTO',    'Devolução no estacionamento Leva e Trás 24h. Incluso translado até o aeroporto.', 50.00, 'fixed',   false, false, null, 6, true),
    (v_tenant, 'CONDUTOR ADICIONAL',        'Valor Diário',                       10.00, 'per_day', false, false, null, 7, true),
    (v_tenant, 'LAVAGEM ANTECIPADA',        'Valor Único',                        45.00, 'fixed',   false, false, null, 8, true),
    (v_tenant, 'PROTEÇÃO DE PNEUS E VIDROS','Cobertura Exclusiva para Vidros, Pneus e Rodas.', 24.90, 'per_day', false, false, null, 9, true)
ON CONFLICT DO NOTHING;

END $$;
