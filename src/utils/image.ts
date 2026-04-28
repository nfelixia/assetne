export async function resizeToJpeg(
  file: File,
  maxPx = 800,
): Promise<{ base64: string; mimeType: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const w      = Math.round(img.width  * ratio)
      const h      = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const base64   = canvas.toDataURL('image/jpeg', 0.85)
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      resolve({ base64, mimeType: 'image/jpeg', fileName })
    }
    img.onerror = reject
    img.src = url
  })
}
