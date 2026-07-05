# Component Checklist — Design System Operacional do i-Frotas

Checklist obrigatório antes de considerar **qualquer** componente novo (ou alteração relevante de um existente) concluído. Ver [ADR-007](../adr/ADR-007-processo-evolucao-design-system.md) para o ciclo completo de vida que este checklist formaliza.

Uso: copiar a seção correspondente para o PR/registro de trabalho do componente e marcar item a item. Nenhum componente avança de etapa com item pendente sem justificativa explícita registrada.

---

## 1. Contrato

- [ ] Responsabilidade única — o componente resolve exatamente um problema, não vários
- [ ] Documento em `docs/ui/<Nome>.md` existe **antes** do código
- [ ] Entradas (props de config) documentadas com tipo e obrigatoriedade
- [ ] Saída (`{el, update?, destroy}` ou variação justificada) documentada
- [ ] Eventos documentados, seguindo a convenção `on<Evento>` (ver `docs/ui/README.md`)
- [ ] "O que o componente nunca faz" está escrito explicitamente
- [ ] Limitações conhecidas documentadas (ex: "não permite mensagem de erro customizada")

## 2. Implementação

- [ ] Implementa exatamente o contrato — nenhuma divergência entre `docs/ui/<Nome>.md` e o código
- [ ] Não possui métodos públicos além dos documentados na Saída
- [ ] Não possui lógica de negócio (regras de domínio, cálculo, validação de dados de negócio)
- [ ] Não importa `supabase`, `js/services/*` ou qualquer serviço de domínio
- [ ] Dependências mínimas — se depende de outro componente, é composição documentada (ex: ConfirmationDialog usa Modal), nunca acoplamento oculto (ex: ler o estado interno de outro componente por instância — ver a correção do `ListView` na Architecture Validation de 2026-07-05)
- [ ] Pode ser instanciado e usado isoladamente, fora de qualquer página, para fins de teste/depuração

## 3. Qualidade

- [ ] Testes automatizados quando o componente tiver lógica testável sem DOM (ex: serviços); para componentes de DOM puro sem jsdom no projeto, ao menos `node --check` de sintaxe
- [ ] Code Review de código (correção, segurança, duplicação)
- [ ] Code Review Arquitetural (aderência ao contrato — ver seções 1 e 2 deste checklist)
- [ ] Sanitização de entradas que podem conter dado dinâmico (`escapeHtml` ou equivalente) — exceto entradas explicitamente documentadas como HTML confiável fornecido pelo desenvolvedor (ex: `Modal.bodyHtml`, `EmptyState.icon`)
- [ ] Nenhuma regressão: suíte de testes do projeto (`npm test`) continua 100% depois da mudança

## 4. UX e Acessibilidade (RF-06)

- [ ] Navegação por teclado (Tab/Shift+Tab) funcional
- [ ] Focus trap, quando o componente for um overlay/modal
- [ ] Foco inicial correto (ao abrir, não a cada `update()`) — **verificar de fato no navegador**, não só ler o código (ver lição da Migração Piloto de `veiculo-detalhe.js`, 2026-07-05: um bug de foco sobreviveu à leitura de código porque só aparecia em execução real)
- [ ] Retorno de foco ao elemento anterior, quando aplicável
- [ ] Suporte a `Esc` para fechar/cancelar, quando aplicável
- [ ] Estado vazio tratado (via `EmptyState`, se for componente de listagem)
- [ ] Estado de erro tratado (via `ErrorState`, se for componente de listagem)
- [ ] Atributos ARIA corretos (`role`, `aria-label`, `aria-modal`, `aria-pressed`, `aria-sort` etc., conforme o tipo de componente)
- [ ] Testado com leitor de tela ou, no mínimo, com a árvore de acessibilidade inspecionada (`preview_snapshot` ou equivalente)

## 5. Integração

- [ ] Migração Piloto realizada — componente adotado por uma tela real antes de ser oferecido para adoção geral
- [ ] Testado em ambiente real (navegador, via `preview_eval`/`preview_snapshot` ou fluxo autenticado quando possível) — não apenas revisão de código
- [ ] Registro correspondente criado/atualizado em `docs/ui/MIGRATION_LOG.md`: componentes adotados, problemas encontrados, ajustes realizados, lições aprendidas, mudanças de API (se houver)
- [ ] Tabela "Status de adoção" em `docs/ui/README.md` atualizada

## 6. Estabilidade

Registrar, para cada componente, as telas que o adotam:

```
<Nome do Componente>
- Tela 1 (data)
- Tela 2 (data)
- Tela 3 (data)
```

Um componente só é promovido a **Stable** quando, simultaneamente:

- está em uso por **pelo menos 3 telas**;
- sua **API pública permaneceu inalterada** durante esse período de adoção;
- **nenhum ajuste arquitetural relevante** foi necessário durante as migrações (correções de bug de implementação interna, como a do foco do Modal, não contam contra isso — desde que a API pública não tenha mudado).

Uma vez **Stable**, qualquer mudança futura na API pública desse componente deixa de ser um ajuste incremental e passa a exigir o mesmo rigor de uma ADR (proposta, justificativa, avaliação de impacto nos consumidores existentes) — ver ADR-007.

A contagem viva de cada componente fica em `docs/ui/README.md`, seção "Critério de Stable" — este checklist não duplica esse número, só define a regra.
