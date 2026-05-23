export interface FileItem {
  key: string
  size: number
  uploaded: string
  httpMetadata: { contentType: string }
  customMetadata?: { thumbnail?: string }
}
