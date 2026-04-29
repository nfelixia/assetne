import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getProductionItems,
  createProductionItem,
  updateProductionItem,
  deleteProductionItem,
  checkOutProductionItem,
  checkInProductionItem,
  uploadProductionPhoto,
} from '~/server/function/production'
import type { ProductionItem, ProductionMovement } from '~/db/schema/production.schema'

export type ProductionItemWithUsage = ProductionItem & {
  usedQty: number
  activeMovements: ProductionMovement[]
}

export const productionQueries = {
  list: () =>
    queryOptions({
      queryKey: ['production-items'],
      queryFn: ({ signal }) => getProductionItems({ signal }),
    }),
}

export function useUploadProductionPhotoMutation() {
  return useMutation({
    mutationFn: (data: { base64: string; mimeType: string; fileName: string }) =>
      uploadProductionPhoto({ data }),
    onError: () => toast.error('Erro ao enviar foto'),
  })
}

export function useCreateProductionItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string
      category: string
      totalQty: number
      condition: 'bom' | 'regular' | 'ruim'
      location?: string
      photoUrl?: string | null
      notes?: string
      codigoInterno?: string
      color?: string
    }) => createProductionItem({ data }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['production-items'] })
      toast.success(`"${variables.name}" cadastrado`)
    },
    onError: () => toast.error('Erro ao cadastrar item'),
  })
}

export function useUpdateProductionItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      id: string
      name: string
      category: string
      totalQty: number
      condition: 'bom' | 'regular' | 'ruim'
      location?: string
      photoUrl?: string | null
      notes?: string
      codigoInterno?: string
      color?: string
    }) => updateProductionItem({ data }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['production-items'] })
      toast.success(`"${variables.name}" atualizado`)
    },
    onError: () => toast.error('Erro ao atualizar item'),
  })
}

export function useDeleteProductionItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProductionItem({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-items'] })
      toast.success('Item removido')
    },
    onError: () => toast.error('Erro ao remover item'),
  })
}

export function useCheckOutProductionItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      itemId: string
      qty: number
      responsible: string
      project?: string
      expectedReturn?: string
      notes?: string
    }) => checkOutProductionItem({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-items'] })
      toast.success('Retirada registrada')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao registrar retirada'),
  })
}

export function useCheckInProductionItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      movementId: string
      statusAfterReturn: 'bom' | 'regular' | 'ruim'
      notes?: string
    }) => checkInProductionItem({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-items'] })
      toast.success('Devolução registrada')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao registrar devolução'),
  })
}
