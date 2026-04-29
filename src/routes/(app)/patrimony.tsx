import { createFileRoute, Outlet } from '@tanstack/react-router'
import { patrimonyQueries } from '~/lib/patrimony/queries'

export const Route = createFileRoute('/(app)/patrimony')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(patrimonyQueries.list()),
  component: () => <Outlet />,
})
