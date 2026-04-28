export const EQUIPMENT_CATEGORIES = [
  'Câmera',
  'Lente',
  'Áudio',
  'Iluminação',
  'Tripé / Suporte',
  'Monitor / Gravador',
  'Acessório',
  'Outro',
] as const

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]
