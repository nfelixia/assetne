import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getEquipmentWithCheckouts,
  createEquipment,
  setEquipmentMaintenance,
} from '~/server/function/equipment'

export type EquipmentStatus = 'available' | 'in-use' | 'maintenance'

export type EquipmentWithCheckout = {
  id: string
  name: string
  category: string
  value: string
  serialNumber: string | null
  status: string
  condition: string
  createdAt: number
  activeCheckout: {
    id: string
    responsible: string
    project: string
    expectedReturn: string | null
    checkedOutAt: number
  } | null
}

export const equipmentQueries = {
  list: () =>
    queryOptions({
      queryKey: ['equipment'],
      queryFn: ({ signal }) => getEquipmentWithCheckouts({ signal }),
    }),
}

export function useCreateEquipmentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      category: string
      value: string
      serialNumber?: string
      condition: 'new' | 'good' | 'regular'
    }) => createEquipment({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Equipamento cadastrado com sucesso')
    },
    onError: () => toast.error('Erro ao cadastrar equipamento'),
  })
}

export function useSetMaintenanceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => setEquipmentMaintenance({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Equipamento enviado para manutenção')
    },
    onError: () => toast.error('Erro ao atualizar status'),
  })
}
