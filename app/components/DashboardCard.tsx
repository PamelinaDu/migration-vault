import { Link } from 'react-router'

type DashboardCardProps = {
  title: string
  description: string
  actionLabel: string
  to: string
}

export function DashboardCard({
  title,
  description,
  actionLabel,
  to,
}: DashboardCardProps) {
  return (
    <div className="rounded-lg border p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Link
        to={to}
        className="mt-4 self-start text-sm font-medium text-primary hover:underline"
      >
        {actionLabel}
      </Link>
    </div>
  )
}
