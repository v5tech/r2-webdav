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
