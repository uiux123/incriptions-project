export type ApiProject = {
  id: number
  name: string
  description: string
  status: 'planning' | 'active' | 'paused' | 'completed'
  progress: number
  task_count: number
  completed_task_count: number
  created_at: string
}

export type ApiWorkspaceInsights = {
  project_count: number
  task_count: number
  completed_task_count: number
  completion_rate: number
}

export type SymbolPrediction = {
  symbol: string
  confidence: number
  candidates: Array<{ symbol: string; confidence: number }>
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export async function createProjectOnApi(name: string): Promise<ApiProject> {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, status: 'planning' }),
  })

  if (!response.ok) {
    throw new Error(`Project creation failed with status ${response.status}`)
  }

  return response.json() as Promise<ApiProject>
}

export async function listProjectsOnApi(): Promise<ApiProject[]> {
  const response = await fetch(`${API_BASE_URL}/api/projects`)
  if (!response.ok) throw new Error(`Project loading failed with status ${response.status}`)
  return response.json() as Promise<ApiProject[]>
}

export async function getWorkspaceInsightsOnApi(): Promise<ApiWorkspaceInsights> {
  const response = await fetch(`${API_BASE_URL}/api/insights/overview`)
  if (!response.ok) throw new Error(`Insight loading failed with status ${response.status}`)
  return response.json() as Promise<ApiWorkspaceInsights>
}

export async function predictSymbolOnApi(file: File): Promise<SymbolPrediction> {
  const formData = new FormData()
  formData.append('image', file)
  const response = await fetch(`${API_BASE_URL}/api/symbols/predict?top_k=3`, { method: 'POST', body: formData })
  if (!response.ok) throw new Error(`Symbol prediction failed with status ${response.status}`)
  return response.json() as Promise<SymbolPrediction>
}
