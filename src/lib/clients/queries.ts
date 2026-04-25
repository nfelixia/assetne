import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getClients, createClient, deleteClient } from '~/server/function/clients'

export const clientsQueries = {
  list: () => queryOptions({ queryKey: ['clients'], queryFn: ({ signal }) => getClients({ signal }) }),
}

export function useCreateClientMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createClient({ data: { name } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente adicionado') },
    onError: () => toast.error('Erro ao adicionar cliente'),
  })
}

export function useDeleteClientMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClient({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente removido') },
    onError: () => toast.error('Erro ao remover cliente'),
  })
}
