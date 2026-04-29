import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { productionQueries } from '~/lib/production/queries'

export const Route = createFileRoute('/(app)/production')({
  beforeLoad: ({ context }: any) => {
    const role = context?.session?.role
    if (role !== 'admin' && role !== 'produtor' && role !== 'gestor_patrimonio') {
      throw redirect({ to: '/dashboard' })
    }
  },
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(productionQueries.list()),
      queryClient.ensureQueryData(productionQueries.withdrawalRequests()),
      queryClient.ensureQueryData(productionQueries.movements()),
    ]),
  component: () => <Outlet />,
})
