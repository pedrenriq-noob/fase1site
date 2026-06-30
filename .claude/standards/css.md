# Padrão: CSS

> Referência: CLAUDE.md § Regras para Frontend (RF-02, RF-03, RF-04, RF-05)

---

## Objetivo

Definir os padrões para escrita de CSS maintainable, escalável e performático. Este padrão garante consistência visual e facilidade de manutenção do código de estilos.

---

## CSS Custom Properties (Variáveis CSS)

### Design Tokens — Definição Central

Todos os valores reutilizáveis devem ser definidos como CSS Custom Properties no arquivo `styles/tokens/`:

```css
/* styles/tokens/colors.css */
:root {
  /* Paleta de cores primária */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-900: #1e3a8a;

  /* Paleta de cores neutras */
  --color-neutral-0: #ffffff;
  --color-neutral-50: #f9fafb;
  --color-neutral-100: #f3f4f6;
  --color-neutral-200: #e5e7eb;
  --color-neutral-700: #374151;
  --color-neutral-900: #111827;

  /* Cores semânticas */
  --color-success: #16a34a;
  --color-error: #dc2626;
  --color-warning: #d97706;
  --color-info: #0284c7;

  /* Cores de texto */
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-700);
  --color-text-disabled: var(--color-neutral-200);

  /* Cores de fundo */
  --color-bg-primary: var(--color-neutral-0);
  --color-bg-secondary: var(--color-neutral-50);
  --color-bg-tertiary: var(--color-neutral-100);
}
```

```css
/* styles/tokens/spacing.css */
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
}
```

```css
/* styles/tokens/typography.css */
:root {
  /* Família de fontes */
  --font-family-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-family-mono: 'JetBrains Mono', 'Courier New', monospace;

  /* Tamanhos */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */

  /* Pesos */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Alturas de linha */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;

  /* Sombras */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* Transições */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
}
```

### Uso Correto de Custom Properties

```css
/* CORRETO: usa tokens */
.button {
  background-color: var(--color-primary-600);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: background-color var(--transition-fast);
}

/* ERRADO: valores hardcoded */
.button {
  background-color: #2563eb;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
}
```

---

## BEM — Block Element Modifier

### Nomenclatura

```
.block {}                   /* Componente independente */
.block__element {}          /* Parte do bloco */
.block--modifier {}         /* Variação do bloco */
.block__element--modifier {} /* Variação do elemento */
```

### Exemplos Completos

```css
/* Bloco: card */
.card {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

/* Elementos do card */
.card__header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-neutral-200);
}

.card__title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.card__body {
  padding: var(--space-6);
}

.card__footer {
  padding: var(--space-4) var(--space-6);
  background: var(--color-bg-secondary);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

/* Modificadores */
.card--featured {
  border: 2px solid var(--color-primary-500);
}

.card--compact .card__body {
  padding: var(--space-4);
}
```

```html
<!-- HTML correspondente -->
<article class="card card--featured">
  <header class="card__header">
    <h2 class="card__title">Título do Card</h2>
  </header>
  <div class="card__body">
    <p>Conteúdo do card...</p>
  </div>
  <footer class="card__footer">
    <button class="button button--secondary">Cancelar</button>
    <button class="button button--primary">Confirmar</button>
  </footer>
</article>
```

### Regras BEM

- Blocos são independentes e reutilizáveis
- Elementos só existem dentro de seu bloco (nunca use `.card__title` fora de `.card`)
- Modificadores descrevem aparência, estado ou comportamento
- Profundidade máxima de aninhamento: 2 níveis (`.block__element`, nunca `.block__element__sub-element`)

---

## Mobile-First

### Estratégia de Breakpoints

```css
/* styles/tokens/breakpoints.css */
:root {
  --bp-sm: 640px;
  --bp-md: 768px;
  --bp-lg: 1024px;
  --bp-xl: 1280px;
  --bp-2xl: 1536px;
}

/* Use em media queries (não px, para respeitar zoom do usuário) */
```

### Escrita Mobile-First

```css
/* CORRETO: escreve para mobile, adiciona para telas maiores */
.grid {
  /* Mobile: 1 coluna (base) */
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 640px) {
  /* Tablet: 2 colunas */
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  /* Desktop: 3 colunas */
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ERRADO: desktop-first */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 1023px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 639px) {
  .grid { grid-template-columns: 1fr; }
}
```

---

## Proibição de !important

`!important` é **proibido** exceto em:
1. Classes utilitárias de visibilidade (`sr-only`, `hidden`)
2. Reset CSS global (arquivo `base/reset.css`)

```css
/* PERMITIDO: utility class documentada */
/**
 * Screen reader only — oculta visualmente mas mantém para leitores de tela.
 * @utility
 */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* PROIBIDO: override de especificidade com !important */
.meu-botao {
  background-color: red !important; /* NÃO FAZER */
}
```

Quando sentir necessidade de usar `!important`, refatore a especificidade do CSS.

---

## Organização de Arquivos CSS

```
styles/
├── base/
│   ├── reset.css       # Reset/normalize
│   └── global.css      # Estilos globais (body, *, ::before, ::after)
├── tokens/
│   ├── colors.css
│   ├── spacing.css
│   └── typography.css
├── utilities/
│   ├── accessibility.css   # .sr-only, .skip-link
│   ├── display.css         # .hidden, .visible
│   └── text.css            # .text-truncate, .text-center
└── main.css               # Importa todos os arquivos acima
```

```css
/* styles/main.css */
@import './base/reset.css';
@import './tokens/colors.css';
@import './tokens/spacing.css';
@import './tokens/typography.css';
@import './base/global.css';
@import './utilities/accessibility.css';
@import './utilities/display.css';
```

---

## Performance CSS

```css
/* Prefira transform e opacity para animações (GPU-aceleradas) */
.element {
  transition: transform var(--transition-normal), opacity var(--transition-normal);
}

.element:hover {
  transform: translateY(-2px); /* SIM */
  /* top: -2px; NÃO — causa layout reflow */
}

/* Use will-change com moderação */
.animating-element {
  will-change: transform; /* Apenas quando necessário e por tempo limitado */
}

/* Evite seletores muito gerais */
/* ERRADO */
* { box-sizing: border-box; } /* OK apenas no reset global */
div > span + p {} /* Muito específico ao DOM */

/* CORRETO */
.component__text {} /* BEM é mais performático */
```

---

## Anti-Padrões CSS

### Especificidade Excessiva
```css
/* ERRADO: difícil de sobrescrever */
#app .container div.card .card__title span {}

/* CORRETO: baixa especificidade */
.card__title-text {}
```

### Magic Numbers
```css
/* ERRADO */
.elemento {
  margin-top: 23px;
  width: 347px;
}

/* CORRETO */
.elemento {
  margin-top: var(--space-6);
  width: 100%;
  max-width: 22rem;
}
```

### Valores Duplicados
```css
/* ERRADO: mesma cor em 5 lugares */
.botao-primario { color: #2563eb; }
.link { color: #2563eb; }
.icone-ativo { fill: #2563eb; }

/* CORRETO: token reutilizado */
.botao-primario { color: var(--color-primary-600); }
.link { color: var(--color-primary-600); }
.icone-ativo { fill: var(--color-primary-600); }
```
