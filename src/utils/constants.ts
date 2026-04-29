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

export const PATRIMONY_CATEGORIES = [
  'Notebook',
  'Computador',
  'Monitor',
  'Armazenamento',
  'Celular / Tablet',
  'Periférico',
  'Móvel',
  'Rede / Internet',
  'Impressora',
  'Ferramenta',
  'Outro',
] as const

export type PatrimonyCategory = (typeof PATRIMONY_CATEGORIES)[number]

export const PATRIMONY_STATUSES = [
  'disponivel',
  'em_uso',
  'emprestado',
  'manutencao',
  'extraviado',
  'baixado',
] as const

export const PATRIMONY_CONDITIONS = [
  'novo',
  'bom',
  'regular',
  'necessita_manutencao',
  'danificado',
] as const

export const PATRIMONY_USE_TYPES = [
  { value: 'uso_interno',        label: 'Uso interno' },
  { value: 'home_office',        label: 'Home Office' },
  { value: 'projeto',            label: 'Projeto' },
  { value: 'cliente',            label: 'Cliente' },
  { value: 'manutencao_externa', label: 'Manutenção externa' },
  { value: 'emprestimo',         label: 'Empréstimo' },
] as const

export const PATRIMONY_MOVEMENT_LABELS: Record<string, string> = {
  created:               'Cadastro',
  updated:               'Edição',
  checked_out:           'Retirada',
  returned:              'Devolução',
  sent_to_maintenance:   'Enviado p/ manutenção',
  maintenance_returned:  'Retornou da manutenção',
  status_changed:        'Status alterado',
  discarded:             'Baixa / Descarte',
  admin_correction:      'Correção administrativa',
}

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
