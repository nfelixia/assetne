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

export const PRODUCTION_CATEGORIES = [
  'Figurino',
  'Adereço',
  'Cenografia',
  'Maquiagem / Arte',
  'Arte Gráfica',
  'Consumível',
  'Outro',
] as const

export type ProductionCategory = (typeof PRODUCTION_CATEGORIES)[number]
