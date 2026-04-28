import { createFileRoute, Outlet } from '@tanstack/react-router'
import { equipmentQueries } from '~/lib/equipment/queries'

export const Route = createFileRoute('/(app)/equipments')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(equipmentQueries.list()),
  component: () => <Outlet />,
})
