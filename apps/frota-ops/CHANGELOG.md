# Changelog — I-Frotas PWA

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Unreleased]

---

## [1.3.0] — 2026-06-28

### Added
- ADRs: documentação de decisões arquiteturais (ADR-001 a ADR-003)
- PR template com checklist de revisão

### Fixed
- `showToast`: mensagem escapada antes de atribuir ao innerHTML (XSS)
- `calcularDisponibilidade`: LOCADO sem `prev_retorno` agora exibe "sem data de retorno previsto" em vez de tratar como disponível
- `hashchange`: `clearUserCache()` chamado antes de renderizar — previne acesso com role em cache
- `showAdminNav`: oculta explicitamente itens `.admin-only` quando role não é admin (antes apenas mostrava)
- Admin sync: `cloneNode(true)` no botão de sync remove listeners duplicados acumulados
- Admin toggle pátio: `.eq('tenant_id', TENANT_ID)` adicionado para isolar por tenant
- Admin sync: `.in('status', [...])` impede sobrescrever veículos em MANUTENCAO

### Security
- `callAdminFn`: session null → redirect para `/login` (antes lançava exceção sem tratamento)
- `escapeHtml()` aplicado em mensagens de erro inseridas via innerHTML no admin

---

## [1.2.0] — 2026-05-15

### Added
- Aba de importação no admin para sincronização com sistema oficial
- Categorias `J-PREMIUM` e `U-UTILITARIO` no mapa de disponibilidade

### Fixed
- Lógica de overbooking: algoritmo de pool substituiu contagem simples por categoria

---

## [1.1.0] — 2026-03-01

### Added
- Painel administrativo com abas: veículos, usuários, pátios
- Sorting em todas as tabelas do admin
- Botão "Ver reserva" no dashboard e na aba de translados

### Fixed
- Translados: exibe apenas reservas pendentes — some automaticamente ao confirmar

---

## [1.0.0] — 2026-01-01

### Added
- PWA com roteamento hash (dashboard, veículos, disponibilidade, reservas, pátio, admin)
- Autenticação via Supabase Auth
- Realtime nas telas de dashboard e pátio
- Service Worker com estratégia cache-first para assets estáticos
- Controle de acesso por role (admin / operador)
- Claude Engineering Framework integrado ao repositório
