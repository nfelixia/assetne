import { createFileRoute, Outlet } from '@tanstack/react-router'
import { patrimonyQueries } from '~/lib/patrimony/queries'

export const Route = createFileRoute('/(app)/patrimony')({
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(patrimonyQueries.list()),
      queryClient.ensureQueryData(patrimonyQueries.withdrawalRequests()),
    ]),
  component: () => <Outlet />,
})
