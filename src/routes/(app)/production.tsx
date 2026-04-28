import { createFileRoute, Outlet } from '@tanstack/react-router'
import { productionQueries } from '~/lib/production/queries'

export const Route = createFileRoute('/(app)/production')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(productionQueries.list()),
  component: () => <Outlet />,
})
