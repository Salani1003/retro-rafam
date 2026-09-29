const KNOWN_MESSAGES: Record<string, string> = {
  SALA_NO_ENCONTRADA: 'No encontramos ninguna retrospectiva con ese código. Revisá el enlace o el código e intentá de nuevo.',
  RETROSPECTIVA_CERRADA: 'Esta retrospectiva ya finalizó, así que no se pueden agregar cambios.',
  NO_ES_PARTICIPANTE: 'Necesitás unirte a esta retrospectiva antes de participar.',
  COMENTARIO_NO_ENCONTRADO: 'Ese comentario ya no existe. Puede que alguien lo haya eliminado.',
}

export class AppError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

function extractCode(raw: string): string | null {
  const match = Object.keys(KNOWN_MESSAGES).find((code) => raw.includes(code))
  return match ?? null
}

export function toUserMessage(error: unknown, fallback = 'Algo salió mal. Intentá de nuevo en unos segundos.'): string {
  if (!error) return fallback

  const raw = error instanceof Error ? error.message : String(error)
  const code = extractCode(raw)
  if (code) return KNOWN_MESSAGES[code]

  if (raw.includes('duplicate key') && raw.includes('room_code')) {
    return 'Ocurrió un problema generando el código de la sala. Intentá crear la retrospectiva de nuevo.'
  }
  if (raw.includes('Failed to fetch') || raw.includes('NetworkError')) {
    return 'No pudimos conectar con el servidor. Revisá tu conexión a internet.'
  }

  return fallback
}
