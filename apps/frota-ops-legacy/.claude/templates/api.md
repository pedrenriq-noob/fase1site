# Template: Documentação de API (Edge Function)

```markdown
# API: {{NOME_DA_EDGE_FUNCTION}}

**URL**: `{{SUPABASE_URL}}/functions/v1/{{nome-da-funcao}}`
**Arquivo**: `supabase/functions/{{nome-da-funcao}}/index.ts`
**Método**: `{{POST | GET | PUT | DELETE}}`

---

## Autenticação

{{REQUER_JWT? SIM - Bearer Token no header Authorization}}
{{ENDPOINT_PUBLICO? NAO REQUER AUTH}}

```http
Authorization: Bearer {{JWT_TOKEN}}
```

---

## Request

### Headers

| Header | Valor | Obrigatório |
|--------|-------|-------------|
| `Authorization` | `Bearer {token}` | Sim |
| `Content-Type` | `application/json` | Sim (se POST) |

### Body (POST/PUT)

```json
{
  "{{campo1}}": "{{tipo e descricao}}",
  "{{campo2}}": {{tipo e descricao}},
  "{{campoOpcional}}": "{{descricao}} (opcional)"
}
```

### Query Parameters (GET)

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `{{param}}` | `string` | Não | {{descricao}} |

---

## Response

### 200 OK — Sucesso

```json
{
  "success": true,
  "data": {
    "{{campo}}": "{{valor_exemplo}}"
  }
}
```

### 400 Bad Request — Validação

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "{{campo}} é obrigatório"
  }
}
```

### 401 Unauthorized — Não autenticado

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token de autenticação necessário"
  }
}
```

### 403 Forbidden — Sem permissão

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Você não tem permissão para esta ação"
  }
}
```

### 500 Internal Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Erro interno do servidor"
  }
}
```

---

## Códigos de Erro

| Código | Status HTTP | Descrição |
|--------|-------------|-----------|
| `UNAUTHORIZED` | 401 | Token ausente ou inválido |
| `FORBIDDEN` | 403 | Sem permissão para a ação |
| `VALIDATION_ERROR` | 400 | Dados de entrada inválidos |
| `NOT_FOUND` | 404 | Recurso não encontrado |
| `INTERNAL_ERROR` | 500 | Erro interno |

---

## Exemplo de Uso

```javascript
const response = await fetch(`${supabaseUrl}/functions/v1/{{nome-da-funcao}}`, {
  method: '{{METODO}}',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    {{campo1}}: '{{valor}}',
  }),
});

const { success, data, error } = await response.json();

if (!success) {
  console.error(error.code, error.message);
  return;
}

console.log(data);
```

---

## Rate Limiting

{{DESCRICAO DO RATE LIMITING SE HOUVER}}
{{EX: 100 requests por minuto por usuário}}

---

## Notas

{{NOTAS_IMPORTANTES_SOBRE_O_USO_OU_LIMITACOES}}
```
