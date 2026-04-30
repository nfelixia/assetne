import { createFileRoute, Outlet } from '@tanstack/react-router'
import { equipmentQueries } from '~/lib/equipment/queries'
import { checkoutHistoryQuery } from '~/lib/checkout/queries'

export const Route = createFileRoute('/(app)/equipments')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(equipmentQueries.list()),
      queryClient.ensureQueryData(checkoutHistoryQuery()),
    ]),
  component: () => <Outlet />,
})
