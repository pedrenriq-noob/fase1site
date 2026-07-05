# Padrão: HTML

> Referência: CLAUDE.md § Regras para Frontend (RF-01, RF-06)

---

## Objetivo

Estabelecer padrões para escrita de HTML semântico, acessível e bem estruturado. HTML é a fundação do conteúdo — deve ter significado mesmo sem CSS e JavaScript.

---

## HTML5 Semântico

### Elementos de Estrutura de Página

Use os elementos corretos para cada seção:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Título Descritivo da Página — Nome do App</title>
  <meta name="description" content="Descrição concisa da página para SEO">
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
  <header role="banner">
    <nav aria-label="Navegação principal">
      <ul>
        <li><a href="/" aria-current="page">Início</a></li>
        <li><a href="/sobre">Sobre</a></li>
      </ul>
    </nav>
  </header>

  <main id="main-content">
    <article>
      <header>
        <h1>Título do Conteúdo Principal</h1>
        <p>Publicado em <time datetime="2024-01-15">15 de janeiro de 2024</time></p>
      </header>
      <section aria-labelledby="secao-intro">
        <h2 id="secao-intro">Introdução</h2>
        <p>Conteúdo...</p>
      </section>
    </article>

    <aside aria-label="Conteúdo relacionado">
      <h2>Artigos Relacionados</h2>
    </aside>
  </main>

  <footer role="contentinfo">
    <p>&copy; 2024 Nome da Empresa</p>
  </footer>
</body>
</html>
```

### Escolha Correta de Elementos

| Situação | Elemento Correto | Errado |
|---|---|---|
| Ação clicável | `<button>` | `<div onclick>` |
| Link de navegação | `<a href>` | `<span onclick>` |
| Lista de itens | `<ul>/<ol>/<li>` | `<div>` repetidos |
| Imagem com significado | `<img alt="...">` | `<div style="background-image">` |
| Formulário | `<form>` | `<div>` com inputs |
| Campo de entrada | `<input type="...">` | `<div contenteditable>` |
| Dado tabular | `<table>` | `<div>` com grid |
| Citação | `<blockquote>` | `<div class="quote">` |
| Código | `<code>/<pre>` | `<span class="code">` |
| Ênfase importante | `<strong>/<em>` | `<b>/<i>` |

---

## Acessibilidade

### WCAG 2.1 Nível AA — Obrigatório

#### 1. Texto Alternativo em Imagens
```html
<!-- Imagem informativa — descreva o conteúdo -->
<img src="grafico-vendas.png" alt="Gráfico de vendas mensais: crescimento de 45% no Q4 2023">

<!-- Imagem decorativa — alt vazio -->
<img src="decoracao.svg" alt="" role="presentation">

<!-- Ícone funcional — descreva a função -->
<button>
  <img src="icon-delete.svg" alt=""> <!-- Alt vazio pois o botão tem texto -->
  Excluir item
</button>

<!-- Ícone sozinho — obrigatório ter texto alternativo -->
<button aria-label="Excluir item">
  <img src="icon-delete.svg" alt="">
</button>
```

#### 2. Contraste de Cores
- Texto normal: mínimo 4.5:1 contra o fundo
- Texto grande (18px+ ou 14px+ bold): mínimo 3:1
- Componentes de UI: mínimo 3:1

#### 3. Hierarquia de Títulos
```html
<!-- CORRETO: hierarquia lógica -->
<h1>Título da Página</h1>
  <h2>Seção Principal</h2>
    <h3>Subseção</h3>
  <h2>Outra Seção</h2>

<!-- ERRADO: pular níveis -->
<h1>Título</h1>
  <h3>Subseção sem h2</h3>
```

#### 4. Labels em Formulários
```html
<!-- CORRETO: label associado -->
<div class="form__group">
  <label for="email">
    Endereço de e-mail
    <span aria-hidden="true" class="required-indicator">*</span>
    <span class="sr-only">(obrigatório)</span>
  </label>
  <input
    type="email"
    id="email"
    name="email"
    required
    aria-describedby="email-hint email-error"
    autocomplete="email"
  >
  <p id="email-hint" class="form__hint">Use seu e-mail corporativo</p>
  <p id="email-error" class="form__error" role="alert" hidden>E-mail inválido</p>
</div>

<!-- ERRADO: sem label -->
<input type="email" placeholder="Digite seu e-mail">
```

#### 5. Navegação por Teclado
```html
<!-- Todos os elementos interativos devem ser focáveis -->
<button type="button">Ação</button> <!-- Naturalmente focável -->

<!-- Para elementos customizados que precisam ser focáveis -->
<div
  role="button"
  tabindex="0"
  aria-label="Fechar modal"
  onkeydown="handleKeydown(event)"
  onclick="closeModal()"
>×</div>
```

---

## Atributos ARIA

### Quando Usar ARIA

**Regra**: Use ARIA somente quando HTML semântico nativo não for suficiente.

```html
<!-- ARIA desnecessário — o elemento já tem semântica -->
<button role="button">Salvar</button> <!-- ERRADO: redundante -->
<button>Salvar</button> <!-- CORRETO -->

<!-- ARIA necessário — elemento customizado -->
<div
  role="combobox"
  aria-expanded="false"
  aria-haspopup="listbox"
  aria-controls="dropdown-list"
>
  Selecione uma opção
</div>
```

### ARIA Estados e Propriedades Comuns

```html
<!-- Indicar estado de carregamento -->
<button aria-busy="true" aria-label="Salvando...">
  <span aria-hidden="true">⏳</span>
  Salvar
</button>

<!-- Região ao vivo para anúncios dinâmicos -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="status-message"></div>

<!-- Modal/Dialog -->
<dialog
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirmar exclusão</h2>
  <p id="modal-description">Esta ação não pode ser desfeita.</p>
</dialog>

<!-- Acordeão -->
<button
  aria-expanded="false"
  aria-controls="accordion-content"
  id="accordion-trigger"
>
  Pergunta frequente
</button>
<div
  id="accordion-content"
  role="region"
  aria-labelledby="accordion-trigger"
  hidden
>
  Resposta...
</div>

<!-- Skip link para navegação por teclado -->
<a href="#main-content" class="skip-link">Pular para o conteúdo principal</a>
```

---

## Formulários

### Estrutura Completa de Formulário

```html
<form
  id="form-cadastro"
  novalidate
  aria-labelledby="form-titulo"
>
  <h2 id="form-titulo">Criar conta</h2>

  <fieldset>
    <legend>Dados pessoais</legend>

    <div class="form__group">
      <label for="nome">Nome completo</label>
      <input
        type="text"
        id="nome"
        name="nome"
        required
        autocomplete="name"
        aria-required="true"
      >
    </div>

    <div class="form__group">
      <label for="data-nascimento">Data de nascimento</label>
      <input
        type="date"
        id="data-nascimento"
        name="data_nascimento"
        aria-describedby="dob-hint"
      >
      <p id="dob-hint" class="form__hint">Formato: DD/MM/AAAA</p>
    </div>
  </fieldset>

  <div class="form__actions">
    <button type="submit">Criar conta</button>
    <button type="button" onclick="resetForm()">Limpar</button>
  </div>
</form>
```

---

## Meta Tags e PWA

```html
<head>
  <!-- Essenciais -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- SEO -->
  <title>Título da Página — Nome do App</title>
  <meta name="description" content="Descrição com 150-160 caracteres">
  <link rel="canonical" href="https://exemplo.com/pagina">

  <!-- Open Graph -->
  <meta property="og:title" content="Título">
  <meta property="og:description" content="Descrição">
  <meta property="og:image" content="https://exemplo.com/og-image.jpg">
  <meta property="og:type" content="website">

  <!-- PWA -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#1a1a2e">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
</head>
```

---

## Anti-Padrões HTML

### Divitis
```html
<!-- ERRADO: divs sem significado -->
<div class="header">
  <div class="nav">
    <div class="nav-item"><div class="link">Home</div></div>
  </div>
</div>

<!-- CORRETO: elementos semânticos -->
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>
```

### Tabelas para Layout
```html
<!-- ERRADO: tabela para layout visual -->
<table>
  <tr>
    <td>Sidebar</td>
    <td>Conteúdo principal</td>
  </tr>
</table>

<!-- CORRETO: CSS para layout -->
<div class="layout">
  <aside class="layout__sidebar">Sidebar</aside>
  <main class="layout__main">Conteúdo</main>
</div>
```

### Inputs sem Label
```html
<!-- ERRADO -->
<input type="text" placeholder="Nome">

<!-- CORRETO -->
<label for="nome">Nome</label>
<input type="text" id="nome" name="nome" placeholder="Ex: João Silva">
```
