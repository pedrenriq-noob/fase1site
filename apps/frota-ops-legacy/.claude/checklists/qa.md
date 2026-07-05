# Checklist: QA

> Referência: skills/qa-engineer.md, workflows/bug.md

---

## Preparação

- [ ] Critérios de aceite disponíveis e claros
- [ ] Ambiente de teste configurado e funcional
- [ ] Dados de teste preparados
- [ ] Acesso às contas necessárias para teste

## Testes Funcionais — Happy Path

- [ ] Todos os critérios de aceite verificados e passando
- [ ] Fluxo principal do usuário funciona do início ao fim
- [ ] Dados salvos corretamente no banco
- [ ] Resposta visual correta após cada ação

## Testes Funcionais — Sad Path

- [ ] Inputs inválidos são rejeitados com mensagem clara
- [ ] Campos obrigatórios vazios mostram erro de validação
- [ ] Valores fora do range mostram erro específico
- [ ] Operações sem permissão são bloqueadas (não apenas ocultas)
- [ ] Tentativa de acesso não autorizado retorna erro adequado

## Casos de Borda

- [ ] Valores mínimos e máximos permitidos testados
- [ ] Lista vazia (empty state) exibida corretamente
- [ ] Lista com muitos itens (paginação funciona)
- [ ] Caracteres especiais em campos de texto
- [ ] Strings muito longas truncadas corretamente

## Estados da UI

- [ ] Estado de loading exibido durante operações
- [ ] Estado de erro com mensagem ao usuário
- [ ] Estado de sucesso confirmado visualmente
- [ ] Estado vazio com ação sugerida

## Cross-Browser

- [ ] Chrome (última versão estável)
- [ ] Firefox (última versão estável)
- [ ] Safari (última versão estável)
- [ ] Edge (última versão estável)

## Cross-Device

- [ ] Desktop (1280px+)
- [ ] Tablet (768px)
- [ ] Mobile grande (390px)
- [ ] Mobile pequeno (320px)
- [ ] iOS Safari
- [ ] Android Chrome

## Regressão

- [ ] Fluxo de login/logout funciona
- [ ] Fluxos críticos do negócio não afetados
- [ ] Features adjacentes ao que mudou estão funcionando

## Documentação de Bugs

- [ ] Bugs encontrados documentados com passos de reprodução
- [ ] Severidade classificada (Crítico/Alto/Médio/Baixo)
- [ ] Screenshots ou vídeo anexados
- [ ] Browser/dispositivo especificado

## Aprovação Final

- [ ] Todos os critérios de aceite passam
- [ ] Nenhum bug crítico ou alto aberto
- [ ] Aprovação formal registrada na issue
