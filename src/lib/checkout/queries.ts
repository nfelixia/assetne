import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createCheckout, createCheckin, getCheckoutHistory } from '~/server/function/checkout'

export const checkoutHistoryQuery = () =>
  queryOptions({
    queryKey: ['checkout-history'],
    queryFn: ({ signal }) => getCheckoutHistory({ signal }),
  })

export function useCheckoutMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      equipmentIds: string[]
      responsible: string
      responsibleRole?: string
      project: string
      expectedReturn?: string
    }) => createCheckout({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Saída registrada com sucesso')
    },
    onError: () => toast.error('Erro ao registrar saída'),
  })
}

export function useCheckinMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      checkoutId: string
      equipmentId: string
      returnCondition: 'perfect' | 'minor' | 'major'
    }) => createCheckin({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment'] })
      toast.success('Devolução registrada com sucesso')
    },
    onError: () => toast.error('Erro ao registrar devolução'),
  })
}
