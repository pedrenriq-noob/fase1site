# Igufoz Cadeirinhas - I-Frotas

Extensão Chrome para gerenciamento em tempo real de cadeirinhas e acessórios para aluguel de veículos (Igufoz, Foz do Iguaçu).

---

## Estrutura do projeto

```
cadeirinhas-extension/
├── manifest.json     # Configuração MV3
├── popup.html        # Interface visual
├── popup.js          # Lógica principal
├── background.js     # Service worker
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## 1. Configurar Google Cloud e OAuth

### 1.1 Criar projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Clique em **Selecionar projeto → Novo projeto**
3. Nome: `Igufoz Cadeirinhas` → Criar

### 1.2 Ativar Google Sheets API

1. No menu lateral: **APIs e serviços → Biblioteca**
2. Busque `Google Sheets API`
3. Clique em **Ativar**

### 1.3 Criar credencial OAuth 2.0

1. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**
2. Tipo de aplicativo: **Extensão do Chrome**
3. Nome: `Igufoz Cadeirinhas`
4. **ID do aplicativo** (deixe em branco por agora — você preencherá depois do passo 2.3)
5. Clique em **Criar**
6. Copie o **ID do cliente** (formato: `XXXXX.apps.googleusercontent.com`)

### 1.4 Tela de consentimento OAuth

1. **APIs e serviços → Tela de consentimento OAuth**
2. Tipo de usuário: **Externo** → Criar
3. Nome do app: `Igufoz Cadeirinhas`
4. E-mail: seu e-mail Google
5. Escopos: adicione `https://www.googleapis.com/auth/spreadsheets`
6. Usuários de teste: adicione seu e-mail

---

## 2. Instalar a extensão no Chrome

### 2.1 Atualizar manifest.json com o Client ID

Abra `manifest.json` e substitua:
```json
"client_id": "SEU_CLIENT_ID.apps.googleusercontent.com"
```
pelo ID copiado no passo 1.3.

### 2.2 Carregar a extensão

1. Abra `chrome://extensions`
2. Ative o **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `cadeirinhas-extension`
5. A extensão aparece com o ícone 🟣 na barra do Chrome

### 2.3 Adicionar o ID da extensão no Google Cloud

1. Copie o **ID da extensão** mostrado em `chrome://extensions` (string de 32 letras)
2. Volte em **Google Cloud → Credenciais → seu OAuth**
3. Em **IDs de aplicativo Chrome**, adicione o ID copiado
4. Salve

---

## 3. Estrutura esperada na planilha

**ID da planilha:** `1GZHmTy6K_QGZD5R_DR5gdN2TQr-aEYXQU-ob5-LvOtM`

**Aba:** `Cadastro`

| Coluna | Campo       | Exemplo           |
|--------|-------------|-------------------|
| A      | Código      | `01-CB`           |
| B      | Categoria   | `CADEIRA DE BEBE` |
| C      | Status      | `DISPONÍVEL`      |
| D      | Data/Hora   | `26/06/2026 15:30`|
| E      | Quem        | `Pedro Henrique`  |
| F      | Observação  | `Sem danos`       |

A linha 1 deve ser o cabeçalho. Itens cadastrados a partir da linha 2.

**Status válidos:** `DISPONÍVEL`, `LOCADO`, `MANUTENÇÃO`

**Categorias suportadas (qualquer nome, lido dinamicamente):**
- `BOOSTER`
- `CADEIRA DE BEBE`
- `BEBE CONFORTO`
- `KIT VIAGEM`

---

## 4. Como usar

### Sincronizar (ler planilha)
- Clique no ícone 🟣 na barra do Chrome
- Clique em **Sincronizar**
- Na primeira vez: faça login com sua conta Google e autorize o acesso
- Os cards de disponibilidade são atualizados

### Registrar saída ou retorno
1. Selecione a **Categoria**
2. Selecione o **Código** (apenas itens com status compatível aparecem)
3. Escolha **Saída** ou **Retorno**
4. Digite o **nome** de quem está pegando/devolvendo
5. Adicione observação (opcional)
6. Clique em **Registrar** → vai para a fila de Pendentes

### Confirmar para a planilha
- Clique **OK** em cada item individual, ou
- Clique **Confirmar Todos** para enviar tudo de uma vez
- A extensão atualiza a linha existente do item na planilha (status + data/hora + quem + obs)
- Sincroniza automaticamente após confirmação

### Descartar
- Clique **✕** para descartar um registro individual
- Clique **Descartar Todos** para limpar a fila

---

## 5. Diferença arquitetural vs. spec original

A spec original propunha `append` (criar nova linha a cada movimentação). Esta implementação usa `PUT` na linha existente do item, o que:

- Mantém exatamente **1 linha por item** na planilha
- Preserva histórico via atualização de status, data e quem
- Evita crescimento infinito de linhas fantasma
- Mantém a planilha como fonte única de verdade

Se quiser histórico de movimentações em aba separada, isso pode ser adicionado como melhoria futura.

---

## 6. Possíveis erros e soluções

| Erro | Causa | Solução |
|------|-------|---------|
| `Erro de autenticação` | Client ID errado ou extensão sem permissão | Verificar `manifest.json` e URI autorizado no Google Cloud |
| `403 Forbidden` | Google Sheets API não ativada | Ativar a API em console.cloud.google.com |
| `401 Unauthorized` | Token expirado | A extensão renova automaticamente; tente sincronizar novamente |
| `Item não encontrado na planilha` | Código não existe na aba Cadastro | Verificar se o item está cadastrado com o código correto |
| `Nenhum item disponível` | Todos os itens da categoria estão locados | Registrar retorno primeiro |
| Popup não abre | Extensão com erro de carregamento | Verificar `chrome://extensions` → Erros |

---

## 7. Checklist de validação

- [ ] Extensão aparece em `chrome://extensions` sem erros
- [ ] Ícone aparece na barra do Chrome
- [ ] Clica ícone → abre popup
- [ ] Clica Sincronizar → pede login Google (primeira vez)
- [ ] Status mostra categorias e quantidades corretas
- [ ] Dropdown de Categoria carrega opções
- [ ] Dropdown de Código filtra por ação (Saída mostra só disponíveis)
- [ ] Registrar → aparece em Pendentes
- [ ] OK / Confirmar Todos → atualiza planilha
- [ ] Sincronizar após confirmar → status reflete alteração
