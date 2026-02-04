import { NavLink, Outlet } from 'react-router'

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'text-sm font-medium',
          isActive
            ? 'text-primary underline'
            : 'text-muted-foreground hover:underline',
        ].join(' ')
      }
      end
    >
      {label}
    </NavLink>
  )
}

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Migration Vault</div>
            <div className="text-sm text-muted-foreground">
              Track your migration documents and invoices
            </div>
          </div>

          <nav className="flex gap-4">
            <NavItem to="/" label="Dashboard" />
            <NavItem to="/documents" label="Documents" />
            <NavItem to="/invoices" label="Invoices" />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
