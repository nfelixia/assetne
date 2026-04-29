import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getPatrimonyItems,
  getPatrimonyItemMovements,
  createPatrimonyItem,
  updatePatrimonyItem,
  deletePatrimonyItem,
  checkOutPatrimonyItem,
  checkInPatrimonyItem,
  sendPatrimonyToMaintenance,
  returnPatrimonyFromMaintenance,
  changePatrimonyStatus,
  uploadPatrimonyPhoto,
  createWithdrawalRequest,
  getWithdrawalRequests,
  approveWithdrawalRequest,
  rejectWithdrawalRequest,
  cancelWithdrawalRequest,
} from '~/server/function/patrimony'
import type { PatrimonyItem, PatrimonyWithdrawalRequest } from '~/db/schema/patrimony.schema'

export type { PatrimonyItem, PatrimonyWithdrawalRequest }

export const patrimonyQueries = {
  list: () =>
    queryOptions({
      queryKey: ['patrimony-items'],
      queryFn:  ({ signal }) => getPatrimonyItems({ signal }),
    }),
  movements: (itemId: string) =>
    queryOptions({
      queryKey: ['patrimony-movements', itemId],
      queryFn:  ({ signal }) => getPatrimonyItemMovements({ data: { itemId }, signal }),
      enabled:  !!itemId,
    }),
  withdrawalRequests: () =>
    queryOptions({
      queryKey: ['patrimony-withdrawal-requests'],
      queryFn:  ({ signal }) => getWithdrawalRequests({ signal }),
      staleTime: 1000 * 30,
    }),
}

export function useUploadPatrimonyPhotoMutation() {
  return useMutation({
    mutationFn: (data: { base64: string; mimeType: string; fileName: string }) =>
      uploadPatrimonyPhoto({ data }),
    onError: () => toast.error('Erro ao enviar foto'),
  })
}

export function useCreatePatrimonyItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createPatrimonyItem>[0]['data']) =>
      createPatrimonyItem({ data }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      toast.success(`"${v.name}" cadastrado`)
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao cadastrar item'),
  })
}

export function useUpdatePatrimonyItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof updatePatrimonyItem>[0]['data']) =>
      updatePatrimonyItem({ data }),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      toast.success(`"${v.name}" atualizado`)
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao atualizar item'),
  })
}

export function useDeletePatrimonyItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePatrimonyItem({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      toast.success('Item removido')
    },
    onError: () => toast.error('Erro ao remover item'),
  })
}

export function useCheckOutPatrimonyItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof checkOutPatrimonyItem>[0]['data']) =>
      checkOutPatrimonyItem({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      toast.success('Saída registrada')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao registrar saída'),
  })
}

export function useCreateWithdrawalRequestMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof createWithdrawalRequest>[0]['data']) =>
      createWithdrawalRequest({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      qc.invalidateQueries({ queryKey: ['patrimony-withdrawal-requests'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao enviar solicitação'),
  })
}

export function useApproveWithdrawalRequestMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => approveWithdrawalRequest({ data: { requestId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      qc.invalidateQueries({ queryKey: ['patrimony-withdrawal-requests'] })
      toast.success('Solicitação aprovada — item retirado')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao aprovar'),
  })
}

export function useRejectWithdrawalRequestMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { requestId: string; rejectionReason?: string }) =>
      rejectWithdrawalRequest({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      qc.invalidateQueries({ queryKey: ['patrimony-withdrawal-requests'] })
      toast.success('Solicitação recusada')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao recusar'),
  })
}

export function useCancelWithdrawalRequestMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => cancelWithdrawalRequest({ data: { requestId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      qc.invalidateQueries({ queryKey: ['patrimony-withdrawal-requests'] })
      toast.success('Solicitação cancelada')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao cancelar'),
  })
}

export function useCheckInPatrimonyItemMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof checkInPatrimonyItem>[0]['data']) =>
      checkInPatrimonyItem({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      toast.success('Devolução registrada')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao registrar devolução'),
  })
}

export function useSendPatrimonyToMaintenanceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { itemId: string; notes?: string }) =>
      sendPatrimonyToMaintenance({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      toast.success('Item enviado para manutenção')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro'),
  })
}

export function useReturnPatrimonyFromMaintenanceMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { itemId: string; condition: string; notes?: string }) =>
      returnPatrimonyFromMaintenance({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      toast.success('Item retornou da manutenção')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro'),
  })
}

export function useChangePatrimonyStatusMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { itemId: string; newStatus: string; notes?: string }) =>
      changePatrimonyStatus({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patrimony-items'] })
      toast.success('Status alterado')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro'),
  })
}
