export const apiClient = {
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
}

// TODO: Replace local JSON reads with authenticated endpoints when available:
// GET /api/dashboard/summary
// GET /api/reports/divisions
// GET /api/reports/subdivisions
// GET /api/reports/trend
