const clamp = (value, low, high) => Math.min(high, Math.max(low, Number(value) || 0));
export function limitarRecorte(rect) {
  const x = clamp(rect.x, 0, 0.95), y = clamp(rect.y, 0, 0.95);
  return { x, y, width: clamp(rect.width, 0.05, 1 - x), height: clamp(rect.height, 0.05, 1 - y) };
}
export function recorteEmPixels(rect, width, height) {
  const r = limitarRecorte(rect), x = Math.floor(r.x * width), y = Math.floor(r.y * height);
  return { x, y, width: Math.max(1, Math.min(width - x, Math.round(r.width * width))), height: Math.max(1, Math.min(height - y, Math.round(r.height * height))) };
}
