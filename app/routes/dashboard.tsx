import { DashboardCard } from '../components/DashboardCard'

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Migration Vault</h1>
        <p className="text-muted-foreground">
          Track your migration documents and invoices
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          title="Documents"
          description="0 documents stored"
          actionLabel="View documents"
          to="/documents"
        />

        <DashboardCard
          title="Invoices"
          description="0 invoices generated"
          actionLabel="View invoices"
          to="/invoices"
        />

        <DashboardCard
          title="Next actions"
          description="Upload a document or create your first invoice"
          actionLabel="Go to dashboard"
          to="/dashboard"
        />
      </section>
    </div>
  )
}
