const DISPLAY_NAME_KEY = 'retro:display-name'

export function getSavedDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveDisplayName(name: string): void {
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, name)
  } catch {
    // localStorage no disponible (modo privado, etc.) — se ignora silenciosamente
  }
}
