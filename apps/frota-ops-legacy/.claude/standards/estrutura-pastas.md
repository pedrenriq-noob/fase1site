# Padrão: Estrutura de Pastas

> Referência: CLAUDE.md § Convenções

---

## Objetivo

Definir a estrutura canônica de diretórios e as convenções de nomenclatura de arquivos para garantir navegabilidade, previsibilidade e organização do projeto.

---

## Estrutura de Diretórios Canônica

```
projeto/
├── .claude/                     # Framework de engenharia (este framework)
├── .github/                     # Configurações GitHub
│   ├── workflows/               # GitHub Actions
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/                        # Documentação do projeto
│   ├── adrs/                    # Architecture Decision Records
│   ├── api/                     # Documentação de APIs
│   └── guides/                  # Guias para desenvolvedores
├── src/                         # Código-fonte principal
│   ├── assets/                  # Recursos estáticos
│   │   ├── icons/               # Ícones SVG
│   │   ├── images/              # Imagens
│   │   └── fonts/               # Fontes
│   ├── components/              # Componentes reutilizáveis de UI
│   │   ├── button/
│   │   │   ├── button.js
│   │   │   ├── button.css
│   │   │   └── button.test.js
│   │   └── modal/
│   ├── features/                # Features da aplicação (por domínio)
│   │   ├── auth/
│   │   │   ├── auth.js          # Lógica de negócio
│   │   │   ├── auth-ui.js       # Componentes de UI
│   │   │   ├── auth.css         # Estilos específicos
│   │   │   └── auth.test.js     # Testes
│   │   ├── dashboard/
│   │   └── profile/
│   ├── lib/                     # Utilitários e helpers compartilhados
│   │   ├── supabase/            # Configuração e abstração do Supabase
│   │   │   ├── client.js        # Inicialização do cliente
│   │   │   └── helpers.js       # Funções auxiliares
│   │   ├── utils/               # Utilitários gerais
│   │   │   ├── date.js
│   │   │   ├── format.js
│   │   │   └── validation.js
│   │   └── constants/           # Constantes da aplicação
│   │       ├── routes.js
│   │       └── config.js
│   ├── styles/                  # Estilos globais
│   │   ├── base/
│   │   │   ├── reset.css
│   │   │   └── typography.css
│   │   ├── tokens/              # Design tokens (CSS custom properties)
│   │   │   ├── colors.css
│   │   │   ├── spacing.css
│   │   │   └── typography.css
│   │   └── utilities/           # Classes utilitárias
│   ├── pages/                   # Páginas da aplicação
│   │   ├── home/
│   │   │   ├── home.js
│   │   │   ├── home.css
│   │   │   └── index.html
│   │   └── about/
│   ├── workers/                 # Service Workers e Web Workers
│   │   ├── sw.js                # Service Worker principal
│   │   └── background-sync.js
│   └── app.js                   # Entry point da aplicação
├── supabase/                    # Configurações do Supabase
│   ├── migrations/              # Migrations de banco de dados
│   │   └── YYYYMMDD_HHMMSS_nome.sql
│   ├── functions/               # Edge Functions
│   │   └── nome-da-funcao/
│   │       └── index.ts
│   └── seed.sql                 # Dados iniciais para desenvolvimento
├── tests/                       # Testes de integração e e2e
│   ├── integration/
│   └── e2e/
├── public/                      # Arquivos públicos estáticos
│   ├── manifest.json            # PWA manifest
│   └── robots.txt
├── .env.example                 # Template de variáveis de ambiente
├── .gitignore
├── package.json
├── CHANGELOG.md
└── README.md
```

---

## Convenções de Nomenclatura de Arquivos

### Regras Gerais

| Tipo de Arquivo | Convenção | Exemplo |
|---|---|---|
| JavaScript | kebab-case | `user-profile.js` |
| CSS | kebab-case | `user-card.css` |
| HTML | kebab-case | `login-page.html` |
| SQL/Migration | snake_case com timestamp | `20240115_143022_add_users_table.sql` |
| Configuração | kebab-case | `jest.config.js` |
| Teste | mesmo nome + `.test` | `user-profile.test.js` |
| Documentação | kebab-case | `getting-started.md` |
| TypeScript (Edge Fn) | kebab-case | `send-email/index.ts` |

### Nomenclatura de Componentes

Componentes seguem a estrutura de diretório com arquivos de mesmo nome:
```
components/
└── user-card/
    ├── user-card.js        # Lógica do componente
    ├── user-card.css       # Estilos do componente
    └── user-card.test.js   # Testes do componente
```

### Nomenclatura de Features

Features são organizadas por domínio de negócio:
```
features/
├── autenticacao/           # Não: auth (seja explícito)
├── gerenciamento-pedidos/  # Não: orders (use português se o domínio é PT)
└── relatorios/
```

### Nomenclatura de Migrations

```
supabase/migrations/
├── 20240101_090000_create_users_table.sql
├── 20240115_143022_add_profile_fields_to_users.sql
├── 20240120_110000_create_orders_table.sql
└── 20240125_160000_add_index_orders_user_id.sql
```

Formato: `YYYYMMDD_HHMMSS_descricao_curta_em_snake_case.sql`

---

## Regras de Organização

### Regra 1: Colocação (Colocation)
Arquivos relacionados ficam no mesmo diretório:
```
features/checkout/
├── checkout.js        # Lógica
├── checkout.css       # Estilos
├── checkout.test.js   # Testes
└── README.md          # Documentação do módulo
```

### Regra 2: Profundidade Máxima
A estrutura de diretórios não deve ter mais de 5 níveis de profundidade:
```
src/features/auth/components/login-form/ ← máximo aceitável
src/features/auth/components/login-form/fields/ ← evitar
```

### Regra 3: Index Files
Use `index.js` apenas para re-exportar — nunca para código de negócio:
```javascript
// components/user-card/index.js — CORRETO: apenas re-exporta
export { UserCard } from './user-card.js';
export { UserCardSkeleton } from './user-card-skeleton.js';

// ERRADO: lógica em index.js
export function renderCard() { /* lógica aqui */ }
```

### Regra 4: Assets Organizados
```
assets/
├── icons/          # SVGs de ícones (nomeados pelo que representam)
│   ├── icon-home.svg
│   ├── icon-user.svg
│   └── icon-settings.svg
├── images/         # Imagens da aplicação
│   ├── logo.png
│   └── hero.webp
└── fonts/          # Fontes locais
    └── inter/
        ├── inter-regular.woff2
        └── inter-bold.woff2
```

### Regra 5: Sem Arquivos Soltos
Não deixe arquivos soltos na raiz de `src/`. Cada arquivo tem um lar:
```
src/
└── app.js          # ÚNICO arquivo permitido na raiz de src/
    └── (entry point da aplicação)
```

---

## Arquivos de Configuração na Raiz

```
projeto/
├── .env.example          # Template (NUNCA .env com valores reais)
├── .eslintrc.json        # Configuração ESLint
├── .prettierrc.json      # Configuração Prettier
├── .gitignore            # Ignorados pelo git
├── jest.config.js        # Configuração de testes
├── package.json          # Dependências e scripts
├── package-lock.json     # Lockfile (commitado)
└── README.md             # Documentação do projeto
```

---

## Anti-Padrões de Estrutura

### Pasta `utils/` como Baú
```
ERRADO:
utils/
├── helpers.js           # 500 linhas de funções sem relação
├── misc.js              # "miscellaneous" não é um domínio
└── stuff.js             # Literalmente chamada de "stuff"

CORRETO:
lib/
├── date-helpers.js      # Funções específicas de data
├── currency-format.js   # Formatação de moeda
└── string-utils.js      # Utilitários de string
```

### Estrutura por Tipo (evitar)
```
EVITAR:
src/
├── controllers/
├── models/
├── views/
└── helpers/

PREFERIR (por domínio/feature):
src/
├── features/
│   ├── auth/
│   ├── orders/
│   └── reports/
└── shared/
```

### Nomes Abreviados e Enigmáticos
```
ERRADO:
├── usr-mgmt.js
├── ord-proc.js
└── inv-calc.js

CORRETO:
├── user-management.js
├── order-processing.js
└── invoice-calculator.js
```
