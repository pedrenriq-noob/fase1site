# Prompt: Nova Tela

## Contexto

Use este prompt ao criar uma nova tela ou página da aplicação. Garante que HTML semântico, CSS BEM, acessibilidade e responsividade sejam considerados desde o início.

---

## Prompt para o Claude

```
Preciso criar uma nova tela com as seguintes características:

Nome da tela: [NOME]
Propósito: [O que o usuário consegue fazer nesta tela]
Usuários afetados: [Quem usará esta tela]
Route/URL: [/caminho/da/tela]

Dados necessários:
- [Quais dados serão exibidos]
- [Quais dados serão coletados]

Design de referência: [Link ou descrição visual]

Por favor, ative os seguintes especialistas:

1. Mobile UX Specialist: avalie o design para mobile-first.
   Verifique hierarquia visual, tamanhos de toque e legibilidade.

2. Vanilla JS Engineer + HTML/CSS standards: implemente a tela com:
   - HTML semântico (standards/html.md)
   - CSS BEM mobile-first (standards/css.md)
   - JavaScript para interatividade (standards/javascript.md)

3. PWA Specialist: verifique cache strategy para esta tela (offline?)

4. Security Reviewer: há dados sensíveis exibidos? Validações necessárias?

5. QA Engineer: defina casos de teste para a nova tela

Use o template em templates/tela.md para a documentação.
Siga o checklist em checklists/frontend.md e checklists/ux.md.
```

---

## Skills Ativadas

| Especialista | Responsabilidade |
|---|---|
| Mobile UX Specialist | Design mobile, alvos de toque, responsividade |
| Vanilla JS Engineer | JavaScript, ES Modules, DOM manipulation |
| Security Reviewer | Validação de inputs, dados sensíveis |
| QA Engineer | Casos de teste para a tela |
| PWA Specialist | Cache e suporte offline (se aplicável) |

---

## Passos de Execução

1. **HTML**: estrutura semântica com elementos corretos
2. **CSS**: estilos mobile-first com BEM e CSS Custom Properties
3. **Acessibilidade**: ARIA, contraste, navegação por teclado
4. **JavaScript**: interatividade com Vanilla JS, tratamento de estados (loading, error, empty)
5. **Supabase**: integração para buscar/salvar dados
6. **Testes**: formulários, navegação, responsividade

---

## Entregáveis Esperados

- [ ] HTML semântico validado (W3C)
- [ ] CSS BEM mobile-first
- [ ] JavaScript com ES Modules e JSDoc
- [ ] Acessibilidade WCAG AA
- [ ] Estados: loading, error, empty, success
- [ ] Tela documentada em templates/tela.md
- [ ] Checklist frontend.md preenchido
- [ ] Checklist ux.md preenchido
