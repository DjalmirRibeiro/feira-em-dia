import { createWorker } from 'tesseract.js';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';

let workerPromise, progress = () => {}, currentWorker, generation = 0;
const base = new URL('./', import.meta.url).href;
export async function lerTexto(blob, report) {
  progress = report;
  if (!workerPromise) {
    const token = generation;
    const pending = createWorker('por', 1, { workerPath: `${base}worker.min.js`, corePath: `${base}core`, langPath: `${base}lang`, workerBlobURL: false,
      logger: event => { if (token === generation) progress(event); }, errorHandler: error => { if (token === generation) progress({ status: 'error', error: String(error) }); }
    }).then(async worker => { if (token !== generation) { await worker.terminate(); throw new Error('Leitura cancelada.'); } currentWorker = worker; return worker; })
      .catch(error => { if (workerPromise === pending) workerPromise = null; throw error; });
    workerPromise = pending;
  }
  const worker = await workerPromise;
  const result = await worker.recognize(blob); return { text: result.data.text, confidence: result.data.confidence };
}
export async function cancelarLeitura() { generation++; const worker = currentWorker; currentWorker = null; workerPromise = null; if (worker) await worker.terminate(); }
export async function lerCodigo(blob) {
  const image = await createImageBitmap(blob);
  try {
    if ('BarcodeDetector' in globalThis) {
      try {
        const supported = await BarcodeDetector.getSupportedFormats(), formats = ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39'].filter(format => supported.includes(format));
        if (formats.length) { const found = await new BarcodeDetector({ formats }).detect(image); if (found.length) return found[0].rawValue; }
      } catch { /* O leitor portátil cobre navegadores sem implementação nativa. */ }
    }
    const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39]], [DecodeHintType.TRY_HARDER, true]]);
    const reader = new BrowserMultiFormatReader(hints), canvas = document.createElement('canvas');
    for (const angle of [0, 90, 180, 270]) {
      canvas.width = angle % 180 ? image.height : image.width; canvas.height = angle % 180 ? image.width : image.height;
      const ctx = canvas.getContext('2d'); ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(angle * Math.PI / 180); ctx.drawImage(image, -image.width / 2, -image.height / 2);
      try { return reader.decodeFromCanvas(canvas).getText(); } catch { /* Tentar outra orientação. */ }
    }
    return '';
  } finally { image.close(); }
}
