import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getProductionItems,
  getProductionMovements,
  createProductionItem,
  updateProductionItem,
  deleteProductionItem,
  checkOutProductionItem,
  checkInProductionItem,
  uploadProductionPhoto,
  createProductionWithdrawalRequest,
  getProductionWithdrawalRequests,
  approveProductionWithdrawalRequest,
  rejectProductionWithdrawalRequest,
  cancelProductionWithdrawalRequest,
} from '~/server/function/production'
import type { ProductionItem, ProductionMovement, ProductionWithdrawalRequest } from '~/db/schema/production.schema'

export type ProductionItemWithUsage = ProductionItem & {
  usedQty: number
  activeMovements: ProductionMovement[]
}

export const productionQueries = {
  list: () =>
    queryOptions({
      queryKey:  ['production-items'],
      queryFn:   ({ signal }) => getProductionItems({ signal }),
      staleTime: 1000 * 30,
    }),
  withdrawalRequests: () =>
    queryOptions({
      queryKey:  ['production-withdrawal-requests'],
      queryFn:   ({ signal }) => getProductionWithdrawalRequests({ signal }),
      staleTime: 1000 * 30,
    }),
  movements: () =>
    queryOptions({
      queryKey:  ['production-movements'],
      queryFn:   ({ signal }) => getProductionMovements({ signal }),
      staleTime: 1000 * 30,
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
      name:          string
      category:      string
      totalQty:      number
      condition:     'bom' | 'regular' | 'ruim'
      location?:     string
      photoUrl?:     string | null
      notes?:        string
      codigoInterno?: string
      color?:        string
    }) => createProductionItem({ data }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['production-items'] })
      qc.invalidateQueries({ queryKey: ['production-movements'] })
      toast.success(`"${variables.name}" cadastrado`)
    },
    onError: () => toast.error('Erro ao cadastrar item'),
  })
}

export function useUpdateProductionItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      id:            string
      name:          string
      category:      string
      totalQty:      number
      condition:     'bom' | 'regular' | 'ruim'
      location?:     string
      photoUrl?:     string | null
      notes?:        string
      codigoInterno?: string
      color?:        string
    }) => updateProductionItem({ data }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['production-items'] })
      qc.invalidateQueries({ queryKey: ['production-movements'] })
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
      qc.invalidateQueries({ queryKey: ['production-withdrawal-requests'] })
      qc.invalidateQueries({ queryKey: ['production-movements'] })
      toast.success('Item removido')
    },
    onError: () => toast.error('Erro ao remover item'),
  })
}

export function useCheckOutProductionItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      itemId:            string
      qty:               number
      responsibleUserId?: string
      responsible:       string
      project?:          string
      expectedReturn?:   string
      conditionOut?:     string
      notes?:            string
    }) => checkOutProductionItem({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-items'] })
      qc.invalidateQueries({ queryKey: ['production-movements'] })
      toast.success('Retirada registrada')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao registrar retirada'),
  })
}

export function useCheckInProductionItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      movementId:        string
      statusAfterReturn: 'bom' | 'regular' | 'ruim'
      notes?:            string
    }) => checkInProductionItem({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-items'] })
      qc.invalidateQueries({ queryKey: ['production-movements'] })
      toast.success('Devolução registrada')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao registrar devolução'),
  })
}

export function useCreateProductionWithdrawalRequestMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      itemId:             string
      responsibleUserId?: string
      responsibleName:    string
      quantity:           number
      projectOrClient?:   string
      expectedReturn?:    string
      conditionOut:       string
      notes?:             string
    }) => createProductionWithdrawalRequest({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-withdrawal-requests'] })
      qc.invalidateQueries({ queryKey: ['production-movements'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao criar solicitação'),
  })
}

export function useApproveProductionWithdrawalRequestMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => approveProductionWithdrawalRequest({ data: { requestId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-items'] })
      qc.invalidateQueries({ queryKey: ['production-withdrawal-requests'] })
      qc.invalidateQueries({ queryKey: ['production-movements'] })
      toast.success('Solicitação aprovada')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao aprovar'),
  })
}

export function useRejectProductionWithdrawalRequestMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { requestId: string; rejectionReason?: string }) =>
      rejectProductionWithdrawalRequest({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-withdrawal-requests'] })
      qc.invalidateQueries({ queryKey: ['production-movements'] })
      toast.success('Solicitação recusada')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao recusar'),
  })
}

export function useCancelProductionWithdrawalRequestMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => cancelProductionWithdrawalRequest({ data: { requestId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production-withdrawal-requests'] })
      qc.invalidateQueries({ queryKey: ['production-movements'] })
      toast.success('Solicitação cancelada')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao cancelar'),
  })
}

export type { ProductionItem, ProductionMovement, ProductionWithdrawalRequest }
