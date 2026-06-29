# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Unreleased]

---

## [1.4.0] — 2026-06-29

### Added
- ADRs: documentação de decisões arquiteturais (ADR-001 a ADR-005)
- PR template com checklist de revisão

### Changed
- Formulário de reserva: data e hora separadas em linhas distintas (elimina colisão visual entre calendário nativo e dropdown de hora)
- Preenchimento automático de data/hora de devolução sempre copia a retirada (usuário altera manualmente se necessário)

### Fixed
- Trigger de transição de status: permite `solicitada → confirmada` diretamente (sem obrigatoriedade de `em_analise`)

---

## [1.3.0] — 2026-06-28

### Added
- Edge Function `_shared/disponibilidade.ts`: lógica de disponibilidade extraída para módulo compartilhado (ADR-004)
- Controle de overbooking em tempo real via verificação antes do insert (com fallback — não bloqueia)
- AbortController para cancelar fetches de disponibilidade em voo quando datas mudam rapidamente

### Fixed
- `calcularSaidaLavador` sempre usava `new Date()` em vez da data de referência — corrigido
- CPF mascarado no WhatsApp: exibia dígitos finais, agora mostra `***.***-XX`
- XSS em mensagens de erro (`esc(e.message)` nos blocos catch)
- Opções de local sem `value` explícito causavam envio de string vazia
- Email validation: regex mais rigorosa para evitar domínios sem TLD
- `esgotado` calculado incorretamente quando `dispReal` era `undefined`
- Modal de confirmação: foco no botão cancelar ao abrir; fecha com Escape

### Security
- Tenant isolation: `UUID regex` validando `tenant_id` e `categoria_id` nas Edge Functions
- `SUPABASE_URL` via variável de ambiente — removida URL hardcoded
- IP do cliente removido dos logs estruturados

---

## [1.2.0] — 2026-05-15

### Added
- Painel admin com abas: veículos, usuários, pátios e importação
- Aba de importação para sync com sistema oficial (I-Frotas)
- Categorias `J-PREMIUM` e `U-UTILITARIO` adicionadas

### Fixed
- Lógica de overbooking: algoritmo de pool substitui contagem simples

---

## [1.1.0] — 2026-04-01

### Added
- Landing page com frota ao vivo e preços por categoria
- Extensão de navegador para cotação rápida integrada ao Supabase
- Pré-seleção de categoria vinda da landing page

### Changed
- Data padrão de retirada: D+1 (era D+0)
- Sync automático da data de devolução com a retirada

---

## [1.0.0] — 2026-01-01

### Added
- Formulário de reserva multi-step (4 etapas)
- Integração com Supabase (categorias, locais, proteções, adicionais)
- Edge Functions `check-disponibilidade` e `criar-solicitacao`
- Envio de confirmação via WhatsApp (link wa.me)
- PWA: manifest + service worker básico
