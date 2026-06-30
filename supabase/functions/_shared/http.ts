// Helpers de resposta HTTP padronizados (RB-03: erros estruturados).

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown }
}

export function errJson(
  code: string,
  message: string,
  status = 400,
  headers: Record<string, string> = {},
  details: unknown = null,
): Response {
  const body: ErrorBody = { error: { code, message, details } }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

export function okJson(data: unknown, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
