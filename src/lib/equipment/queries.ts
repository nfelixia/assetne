import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getEquipmentWithCheckouts,
  createEquipment,
  setEquipmentMaintenance,
  setEquipmentAvailable,
  updateEquipment,
  deleteEquipment,
  uploadEquipmentPhoto,
} from '~/server/function/equipment'

export type EquipmentStatus = 'available' | 'in-use' | 'maintenance'

export type EquipmentWithCheckout = {
  id: string
  name: string
  category: string
  value: string
  serialNumber: string | null
  codigo: string | null
  status: string
  condition: string
  photoUrl: string | null
  createdAt: number
  activeCheckout: {
    id: string
    responsible: string
    responsibleRole: string | null
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

export function useUploadEquipmentPhotoMutation() {
  return useMutation({
    mutationFn: (data: { base64: string; mimeType: string; fileName: string }) =>
      uploadEquipmentPhoto({ data }),
    onError: () => toast.error('Erro ao enviar foto'),
  })
}

export function useCreateEquipmentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      category: string
      value: string
      serialNumber?: string
      codigo?: string
      condition: 'new' | 'good' | 'regular'
      photoUrl?: string | null
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

export function useSetAvailableMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => setEquipmentAvailable({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Equipamento marcado como disponível')
    },
    onError: () => toast.error('Erro ao atualizar status'),
  })
}

export function useUpdateEquipmentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      id: string
      name: string
      category: string
      value: string
      serialNumber?: string
      codigo?: string
      condition: 'new' | 'good' | 'regular'
      photoUrl?: string | null
    }) => updateEquipment({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Equipamento atualizado')
    },
    onError: () => toast.error('Erro ao atualizar equipamento'),
  })
}

export function useDeleteEquipmentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEquipment({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Equipamento removido')
    },
    onError: () => toast.error('Erro ao remover equipamento'),
  })
}
