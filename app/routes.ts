import { type RouteConfig, index, route } from '@react-router/dev/routes'

export default [
  index('routes/dashboard.tsx'),
  route('documents', 'routes/documents.tsx'),
  route('invoices', 'routes/invoices.tsx'),
  route('api/documents/upload-url', 'routes/api.documents.upload-url.ts'),
] satisfies RouteConfig
