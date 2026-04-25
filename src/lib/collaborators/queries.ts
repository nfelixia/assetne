import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getCollaborators, createCollaborator, deleteCollaborator } from '~/server/function/collaborators'

export const collaboratorsQueries = {
  list: () => queryOptions({ queryKey: ['collaborators'], queryFn: ({ signal }) => getCollaborators({ signal }) }),
}

export function useCreateCollaboratorMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; role?: string }) => createCollaborator({ data }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collaborators'] }); toast.success('Colaborador adicionado') },
    onError: () => toast.error('Erro ao adicionar colaborador'),
  })
}

export function useDeleteCollaboratorMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCollaborator({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['collaborators'] }); toast.success('Colaborador removido') },
    onError: () => toast.error('Erro ao remover colaborador'),
  })
}
