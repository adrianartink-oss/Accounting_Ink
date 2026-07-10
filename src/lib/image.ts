/** Ergebnis der Bildaufbereitung für Scan & Speicherung. */
export interface PreparedImage {
  /** Skaliertes JPEG als Blob (für IndexedDB). */
  blob: Blob
  /** base64 (ohne data:-Präfix) für die Anthropic-API. */
  base64: string
  mediaType: 'image/jpeg'
  /** Kleine Vorschau als Data-URL. */
  thumbnail: string
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawScaled(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob fehlgeschlagen'))),
      'image/jpeg',
      quality,
    )
  })
}

async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  return dataUrl.split(',')[1] ?? ''
}

/**
 * Bereitet ein aufgenommenes/ausgewähltes Belegbild auf: skaliert es
 * (Standard-Langkante 1600 px – gute Balance aus Lesbarkeit und Token-Kosten)
 * und erzeugt Blob, base64 und Vorschau.
 */
export async function prepareImage(file: File, maxDim = 1600): Promise<PreparedImage> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const canvas = drawScaled(img, maxDim)
    const blob = await canvasToBlob(canvas, 0.85)
    const base64 = await blobToBase64(blob)

    const thumbCanvas = drawScaled(img, 240)
    const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7)

    return { blob, base64, mediaType: 'image/jpeg', thumbnail }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
