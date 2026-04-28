export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

export function parseEquipmentValue(text: string): number {
  const cleaned = text
    .replace(/R\$\s*/g, '')
    .trim()
    .replace(/\.(\d{3})/g, '$1')
    .replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

export function displayEquipmentValue(text: string): string {
  const num = parseEquipmentValue(text)
  const stripped = text.trim().replace(/R\$\s*/g, '')
  if (num === 0 && !/^[0-9]/.test(stripped)) return text
  return formatCurrency(num)
}

export function normalizeText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}
