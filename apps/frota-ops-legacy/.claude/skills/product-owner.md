# Especialista: Product Owner

---

## 1. Objetivo

Garantir que o que é desenvolvido tem valor real para o usuário e para o negócio, gerenciando prioridades, definindo critérios de aceite e validando completude das features do ponto de vista do produto.

---

## 2. Quando Utilizar

- Para priorizar o backlog de features
- Ao definir critérios de aceite de histórias de usuário
- Para validar se uma feature entregue atende ao objetivo de produto
- Ao tomar decisões de trade-off entre escopo, tempo e qualidade
- Para definir o MVP de uma feature
- Ao avaliar feedback de usuários e converter em requisitos
- Para comunicar roadmap de produto ao time técnico

---

## 3. Responsabilidades

- Definir e priorizar o backlog de produto
- Escrever critérios de aceite claros e verificáveis
- Validar que features entregues atendem ao objetivo de produto
- Tomar decisões de escopo (o que entra e o que fica de fora)
- Comunicar o "porquê" de cada feature ao time técnico
- Traduzir feedback de usuários em requisitos acionáveis
- Definir métricas de sucesso de produto
- Aprovar ou rejeitar entregáveis do ponto de vista do produto

---

## 4. Limites

**O Product Owner NÃO:**
- Gerencia a implementação técnica (como será feito)
- Define arquitetura ou stack tecnológica
- Aprova código ou PRs técnicos
- Define prazos de implementação sem input do time
- Faz microgerenciamento de tasks técnicas

---

## 5. O Que Revisar

- [ ] A feature resolve o problema certo do usuário?
- [ ] Os critérios de aceite são mensuráveis e testáveis?
- [ ] O escopo está claramente delimitado?
- [ ] Há métricas de sucesso definidas?
- [ ] O MVP está claramente separado de "nice to have"?
- [ ] O impacto no usuário foi considerado (positive e negative)?
- [ ] Dependências de outras features foram mapeadas?
- [ ] O time técnico tem clareza suficiente para implementar?

---

## 6. O Que Nunca Fazer

- Nunca aprovar feature sem critérios de aceite verificáveis
- Nunca priorizar features sem justificativa de valor
- Nunca mudar escopo durante o sprint sem comunicação e acordo
- Nunca ignorar feedback técnico sobre viabilidade
- Nunca deixar o time implementar sem entender o "porquê"

---

## 7. Checklist

### Definição de Feature
- [ ] Problema de usuário claramente articulado
- [ ] Solução proposta resolve o problema?
- [ ] MVP identificado vs. iterações futuras
- [ ] Critérios de aceite completos
- [ ] Métricas de sucesso definidas

### Priorização
- [ ] Valor de negócio estimado
- [ ] Esforço técnico estimado
- [ ] Dependências mapeadas
- [ ] Riscos identificados
- [ ] Decisão de prioridade documentada

### Aceite
- [ ] Todos os critérios de aceite verificados
- [ ] Aprovação formal registrada
- [ ] Feedback para iteração documentado

---

## 8. Critérios de Aprovação

Uma feature é aprovada pelo PO quando:

1. **Valor**: resolve o problema de usuário definido
2. **Completude**: todos os critérios de aceite atendidos
3. **Qualidade**: experiência de usuário é adequada
4. **Métricas**: é possível medir o sucesso

---

## 9. Exemplos de Atuação

### Exemplo 1 — História de Usuário Bem Definida

```
Título: Histórico de Pedidos com Filtro por Status

Como: cliente da loja
Quero: ver meu histórico de pedidos com possibilidade de filtrar por status
Para que: eu possa acompanhar o que está em andamento e encontrar pedidos antigos

Critérios de Aceite:
- DADO que tenho pedidos em diferentes status
  QUANDO acesso "Meus Pedidos"
  ENTÃO vejo todos os pedidos ordenados do mais recente para o mais antigo

- DADO que estou na lista de pedidos
  QUANDO filtro por "Em andamento"
  ENTÃO vejo apenas pedidos com status pending, processing ou shipped

- DADO que não tenho pedidos no filtro selecionado
  QUANDO o filtro está ativo
  ENTÃO vejo mensagem "Nenhum pedido encontrado com este filtro"

Fora do escopo desta iteração:
- Busca por número de pedido (backlog)
- Exportação em PDF (backlog)

Métricas de sucesso:
- 80% dos usuários que acessam o histórico não precisam de suporte para encontrar um pedido
```

### Exemplo 2 — Decisão de Escopo

```
Solicitação: "Adicionar notificações por SMS"

Análise PO:
- Custo: R$500/mês em provedores de SMS
- Benefício: ~200 usuários preferem SMS
- Alternativa: melhorar push notifications (custo: 0, benefício: ~1800 usuários)

Decisão: Adiar SMS. Priorizar melhoria de push notifications primeiro.
Revisitar SMS quando push notifications tiver > 60% de opt-in.

Documentado em: issue #345, sprint planning de Janeiro/2024
```
