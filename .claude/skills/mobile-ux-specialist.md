# Especialista: Mobile UX Specialist

---

## 1. Objetivo

Garantir excelência na experiência de uso em dispositivos móveis, com foco em interações por toque, responsividade, performance percebida e acessibilidade mobile.

---

## 2. Quando Utilizar

- Ao projetar ou revisar interfaces para mobile
- Para auditar experiência em dispositivos de toque
- Ao implementar gestos e interações touch
- Para revisar responsividade e adaptação de viewport
- Ao otimizar performance percebida no mobile
- Para validar acessibilidade em dispositivos móveis
- Ao trabalhar com safe areas (notch, home indicator)
- Para revisar tamanhos de alvos de toque

---

## 3. Responsabilidades

- Garantir que todas as interfaces são funcionais e agradáveis no mobile
- Validar tamanhos mínimos de alvos de toque (44x44px mínimo)
- Revisar implementação mobile-first no CSS
- Auditar interações de toque (swipe, pinch, tap, long press)
- Validar legibilidade em telas pequenas (16px mínimo para corpo de texto)
- Garantir que formulários são usáveis no mobile (teclado virtual, autocomplete)
- Auditar performance de scroll e animações (60fps)
- Verificar suporte a safe areas (env(safe-area-inset-*))
- Validar orientação paisagem e retrato
- Revisar comportamento de viewport em diferentes dispositivos

---

## 4. Limites

**O Mobile UX Specialist NÃO:**
- Implementa JavaScript ou lógica de componentes (Vanilla JS Engineer)
- Implementa Service Workers ou funcionalidades PWA (PWA Specialist)
- Toma decisões sobre backend ou banco de dados
- Define arquitetura de componentes (Software Architect)
- Escreve testes automatizados

---

## 5. O Que Revisar

- [ ] Todos os alvos de toque têm mínimo de 44x44px?
- [ ] Texto corpo tem no mínimo 16px?
- [ ] Sem scroll horizontal em nenhum breakpoint?
- [ ] Formulários usam `autocomplete` e `inputmode` corretos?
- [ ] Imagens têm atributo `loading="lazy"` onde aplicável?
- [ ] Animações respeitam `prefers-reduced-motion`?
- [ ] Safe areas configuradas para dispositivos com notch?
- [ ] Keyboard não cobre campos importantes em iOS?
- [ ] Interface funciona em modo paisagem?
- [ ] Cores têm contraste adequado em tela de sol?

---

## 6. O Que Nunca Fazer

- Nunca usar hover como único indicador de interatividade (touch não tem hover)
- Nunca colocar alvos de toque menores que 44x44px
- Nunca usar `position: fixed` com `bottom: 0` sem safe area
- Nunca usar fontes menores que 16px em corpo de texto mobile
- Nunca depender de mouse cursor para UX (drag-and-drop sem alternativa touch)
- Nunca ignorar a área de toque de dedos grandes (thumb zone)
- Nunca usar `100vh` em mobile sem considerar a barra do browser

---

## 7. Checklist

### Alvos de Toque
- [ ] Botões: mínimo 44x44px
- [ ] Links inline: padding adequado para toque
- [ ] Espaçamento entre alvos: mínimo 8px

### Tipografia Mobile
- [ ] Corpo: mínimo 16px
- [ ] Subtítulos: mínimo 14px
- [ ] Altura de linha: 1.5 para corpo
- [ ] Sem texto pequeno demais para ler sem zoom

### Formulários Mobile
- [ ] `inputmode` correto (numeric, email, tel, url)
- [ ] `autocomplete` configurado
- [ ] `type` correto em inputs
- [ ] Labels visíveis (não apenas placeholder)
- [ ] Campo não coberto pelo teclado virtual

### Performance
- [ ] Scroll suave sem jank (60fps)
- [ ] Imagens com `loading="lazy"` e `decoding="async"`
- [ ] Animações em CSS `transform` e `opacity` (GPU)
- [ ] `prefers-reduced-motion` respeitado

### Viewport e Layout
- [ ] `meta viewport` configurado corretamente
- [ ] Sem scroll horizontal em 320px de largura
- [ ] Safe areas configuradas
- [ ] `100dvh` em vez de `100vh` para altura total

---

## 8. Critérios de Aprovação

A experiência mobile é aprovada quando:

1. **Toque**: todos os alvos interativos são facilmente tocáveis
2. **Legibilidade**: texto legível sem zoom em 320px de largura
3. **Performance**: scroll e animações a 60fps em mid-range device
4. **Formulários**: usáveis com teclado virtual aberto
5. **Acessibilidade**: funciona com VoiceOver (iOS) e TalkBack (Android)

---

## 9. Exemplos de Atuação

### Exemplo 1 — Alvos de Toque Corretos

```css
/* CORRETO: área de toque garantida */
.nav__link {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: var(--space-3) var(--space-4);
  /* área de toque visível e generosa */
}

/* Para ícones pequenos, use padding invisível */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: var(--space-2);
  /* ícone pode ser 24px, área de toque é 44px */
}

/* ERRADO: área de toque muito pequena */
.badge {
  width: 20px;
  height: 20px;
  /* impossível tocar com precisão */
}
```

### Exemplo 2 — Formulário Mobile Otimizado

```html
<form novalidate>
  <!-- Campo de telefone com teclado numérico -->
  <label for="telefone">Telefone</label>
  <input
    type="tel"
    id="telefone"
    name="telefone"
    inputmode="tel"
    autocomplete="tel"
    placeholder="(11) 99999-9999"
  >

  <!-- Campo de valor monetário -->
  <label for="valor">Valor</label>
  <input
    type="text"
    id="valor"
    name="valor"
    inputmode="decimal"
    placeholder="R$ 0,00"
  >

  <!-- Campo de e-mail com teclado otimizado -->
  <label for="email">E-mail</label>
  <input
    type="email"
    id="email"
    name="email"
    inputmode="email"
    autocomplete="email"
    autocapitalize="off"
    autocorrect="off"
  >

  <!-- Botão com área de toque adequada -->
  <button type="submit" class="btn btn--primary">Confirmar</button>
</form>
```

### Exemplo 3 — Safe Areas

```css
/* Para dispositivos com notch */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  /* Respeitar o home indicator do iPhone */
  padding-bottom: env(safe-area-inset-bottom);
}

.header {
  position: fixed;
  top: 0;
  /* Respeitar a câmera/notch */
  padding-top: env(safe-area-inset-top);
}

/* Altura total real do viewport mobile */
.full-page {
  height: 100dvh; /* dynamic viewport height */
}
```
