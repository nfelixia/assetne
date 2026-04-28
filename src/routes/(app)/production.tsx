import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { productionQueries } from '~/lib/production/queries'

export const Route = createFileRoute('/(app)/production')({
  beforeLoad: ({ context }: any) => {
    const role = context?.session?.role
    if (role !== 'admin' && role !== 'produtor') throw redirect({ to: '/dashboard' })
  },
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(productionQueries.list()),
  component: () => <Outlet />,
})
