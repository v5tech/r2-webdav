export interface TrashSession {
  deletedAt: number
  rootEntries: string[]
  totalCount: number
}

export async function fetchTrash(): Promise<TrashSession[]> {
  const res = await fetch('/api/trash')
  if (!res.ok) throw new Error(`Failed to fetch trash: ${res.status}`)
  return res.json() as Promise<TrashSession[]>
}

export async function restoreSession(deletedAt: number): Promise<void> {
  const res = await fetch('/api/trash', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deletedAt }),
  })
  if (!res.ok) throw new Error(`Failed to restore: ${res.status}`)
}

export async function permanentDeleteSession(deletedAt: number): Promise<void> {
  const res = await fetch(`/api/trash?ts=${deletedAt}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete: ${res.status}`)
}
