import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('dashboard', 'routes/dashboard.tsx'),
  route('documents', 'routes/documents.tsx'),
  route('invoices', 'routes/invoices.tsx'),
] satisfies RouteConfig
