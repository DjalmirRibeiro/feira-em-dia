import { limitarRecorte, recorteEmPixels } from './crop-core.js?v=7';
import { prepararFoto } from './catalog-store.js?v=7';

export function criarRecortador() {
  const $ = id => document.getElementById(id), dialog = $('crop-dialog'), canvas = $('crop-canvas'), selection = $('crop-selection');
  let image, url, rect, rotation = 0, dragging = null, complete, busy = false;
  function update() {
    rect = limitarRecorte(rect);
    Object.assign(selection.style, { left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` });
    for (const key of ['x', 'y', 'width', 'height']) { $(`crop-${key}`).value = Math.round(rect[key] * 100); $(`crop-${key}-value`).textContent = `${Math.round(rect[key] * 100)}%`; }
  }
  function draw() {
    const scale = Math.min(1, 3000 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.round(image.naturalWidth * scale), height = Math.round(image.naturalHeight * scale), turn = rotation % 180 !== 0;
    canvas.width = turn ? height : width; canvas.height = turn ? width : height;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(rotation * Math.PI / 180); ctx.drawImage(image, -width / 2, -height / 2, width, height); ctx.restore();
    $('crop-stage').style.width = `min(100%, ${Math.min(520, Math.round(340 * canvas.width / canvas.height))}px)`;
    rect = { x: 0, y: 0, width: 1, height: 1 }; update();
  }
  function close(result) { if (busy) return; dialog.close(); complete?.(result); complete = null; if (url) URL.revokeObjectURL(url); image = null; }
  selection.addEventListener('pointerdown', event => {
    if (busy) return;
    event.preventDefault(); selection.setPointerCapture(event.pointerId);
    dragging = { x: event.clientX, y: event.clientY, original: { ...rect }, edge: event.target.dataset.edge || 'move', bounds: canvas.getBoundingClientRect() };
  });
  selection.addEventListener('pointermove', event => {
    if (!dragging) return;
    const d = dragging, dx = (event.clientX - d.x) / d.bounds.width, dy = (event.clientY - d.y) / d.bounds.height, original = d.original;
    if (d.edge === 'move') rect = { ...original, x: Math.max(0, Math.min(1 - original.width, original.x + dx)), y: Math.max(0, Math.min(1 - original.height, original.y + dy)) };
    else {
      const left = d.edge.includes('w') ? Math.max(0, Math.min(original.x + original.width - 0.05, original.x + dx)) : original.x;
      const top = d.edge.includes('n') ? Math.max(0, Math.min(original.y + original.height - 0.05, original.y + dy)) : original.y;
      const right = d.edge.includes('e') ? Math.min(1, Math.max(original.x + 0.05, original.x + original.width + dx)) : original.x + original.width;
      const bottom = d.edge.includes('s') ? Math.min(1, Math.max(original.y + 0.05, original.y + original.height + dy)) : original.y + original.height;
      rect = { x: left, y: top, width: right - left, height: bottom - top };
    }
    update();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) selection.addEventListener(event, () => { dragging = null; });
  for (const key of ['x', 'y', 'width', 'height']) $(`crop-${key}`).addEventListener('input', event => { rect[key] = Number(event.target.value) / 100; update(); });
  $('crop-whole').addEventListener('click', () => { rect = { x: 0, y: 0, width: 1, height: 1 }; update(); });
  $('crop-center').addEventListener('click', () => { rect = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }; update(); });
  $('crop-rotate').addEventListener('click', () => { rotation = (rotation + 90) % 360; draw(); });
  $('crop-cancel').addEventListener('click', () => close(null));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(null); });
  $('crop-apply').addEventListener('click', async () => {
    if (busy) return; busy = true; $('crop-apply').disabled = true; $('crop-error').textContent = '';
    try {
      const pixels = recorteEmPixels(rect, canvas.width, canvas.height), output = document.createElement('canvas'); output.width = pixels.width; output.height = pixels.height;
      output.getContext('2d').drawImage(canvas, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, pixels.width, pixels.height);
      const blob = await new Promise(resolve => output.toBlob(resolve, 'image/jpeg', 0.94));
      if (!blob) throw new Error('Não foi possível preparar o recorte.');
      const result = await prepararFoto(blob); busy = false; close(result);
    } catch (error) { $('crop-error').textContent = error.message; }
    finally { busy = false; $('crop-apply').disabled = false; }
  });
  return async file => {
    if (complete) throw new Error('Conclua o recorte atual antes de abrir outra foto.');
    if (!file?.type.startsWith('image/')) throw new Error('Selecione uma imagem.');
    if (file.size > 20 * 1024 * 1024) throw new Error('Escolha uma foto de até 20 MB.');
    url = URL.createObjectURL(file); image = new Image(); rotation = 0;
    try { await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Não foi possível abrir a foto. Tente JPG, PNG ou WebP.')); image.src = url; }); }
    catch (error) { URL.revokeObjectURL(url); image = null; throw error; }
    draw(); $('crop-error').textContent = ''; dialog.showModal(); return new Promise(resolve => { complete = resolve; });
  };
}
