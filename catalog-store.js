// Metadados e fotos ficam juntos na transação, fora do localStorage e sem upload.
let opening;
function database() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('Este navegador não disponibilizou o armazenamento do catálogo.'));
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open('feira-em-dia-catalogo', 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('products', { keyPath: 'key' });
      store.createIndex('scope', 'scope');
    };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); opening = null; }; resolve(db); };
    request.onerror = () => { opening = null; reject(new Error('Não foi possível abrir o catálogo. Verifique o espaço e as permissões do navegador.')); };
    request.onblocked = () => { opening = null; reject(new Error('Feche outras abas deste aplicativo e tente abrir o catálogo novamente.')); };
  });
  return opening;
}
const scopeKey = scope => { if (!['real', 'demo'].includes(scope)) throw new Error('Base do catálogo inválida.'); return scope; };
async function transact(mode, run) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products', mode); let result, failure;
    tx.oncomplete = () => resolve(result);
    tx.onerror = tx.onabort = () => reject(failure || new Error('Não foi possível salvar ou ler o catálogo. Verifique o espaço disponível.'));
    try { run(tx.objectStore('products'), value => { result = value; }, error => { failure = error; tx.abort(); }); } catch (error) { tx.abort(); reject(error); }
  });
}
export async function listarProdutos(scope) {
  return transact('readonly', (store, done) => { const request = store.index('scope').getAll(scopeKey(scope)); request.onsuccess = () => done(request.result.map(({ key, scope, ...product }) => product)); });
}
export async function salvarProduto(scope, product) {
  scopeKey(scope);
  if (!product.id) throw new Error('Produto sem identificação.');
  const value = { ...product, updatedAt: new Date().toISOString(), scope, key: `${scope}:${product.id}` };
  await transact('readwrite', (store, done, fail) => {
    const request = store.index('scope').getAll(scope);
    request.onsuccess = () => {
      const duplicate = !product.archived && product.barcode && request.result.some(row => !row.archived && row.id !== product.id && row.barcode?.toLowerCase() === product.barcode.toLowerCase());
      if (duplicate) fail(new Error('Este código já pertence a outro produto ativo. Corrija o código antes de salvar ou restaurar.'));
      else store.put(value);
    };
  });
}
export async function semearExemplos(products) {
  await transact('readwrite', store => {
    const request = store.index('scope').getAll('demo');
    request.onsuccess = () => {
      const existing = new Map(request.result.map(p => [p.id, p])), codes = new Set(request.result.filter(p => !p.archived).map(p => p.barcode?.toLowerCase()).filter(Boolean));
      for (const product of products) {
        const previous = existing.get(product.id);
        if (!previous && !codes.has(product.barcode.toLowerCase())) store.put({ ...product, scope: 'demo', key: `demo:${product.id}`, updatedAt: new Date().toISOString() });
        else if(previous?.synthetic){const enriched={...previous};let changed=false;if(!previous.photo&&product.photo){enriched.photo=product.photo;enriched.imageSource=product.imageSource;changed=true;}if(!previous.contentQuantity&&product.contentQuantity){enriched.contentQuantity=product.contentQuantity;enriched.contentUnit=product.contentUnit;changed=true;}if(previous.stockByContent===undefined){enriched.stockByContent=product.stockByContent;changed=true;}if(changed)store.put(enriched);}
      }
    };
  });
}
export async function prepararFoto(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Selecione uma imagem do produto ou da etiqueta.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Escolha uma foto de até 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Não foi possível ler esta foto. Tente uma imagem JPG, PNG ou WebP.')); image.src = url; });
    const scale = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Este navegador não conseguiu preparar a foto.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const photo = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    if (!photo || photo.size > 2 * 1024 * 1024) throw new Error('A foto ficou muito grande. Tente fotografar mais perto e com resolução menor.');
    return photo;
  } finally { URL.revokeObjectURL(url); }
}
export const fotoParaBackup = blob => blob ? new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Não foi possível exportar uma foto.')); reader.readAsDataURL(blob); }) : Promise.resolve(null);
export async function restaurarProdutosNovos(scope,records){
  scopeKey(scope);let added=0;
  const decoded=records.map(product=>{const decode=value=>{if(!value)return null;const [header,data]=value.split(',');const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));return new Blob([bytes],{type:header.slice(5,header.indexOf(';'))});};return{...product,photo:decode(product.photo),labelPhoto:decode(product.labelPhoto)};});
  await transact('readwrite',(store,done,fail)=>{const request=store.index('scope').getAll(scope);request.onsuccess=()=>{const existing=new Map(request.result.map(p=>[p.id,p]));const codes=new Map(request.result.filter(p=>!p.archived&&p.barcode).map(p=>[p.barcode.toLowerCase(),p.id]));for(const product of decoded){if(existing.has(product.id))continue;if(!product.archived&&product.barcode&&codes.has(product.barcode.toLowerCase())){fail(new Error('Um código do backup já existe em outro cadastro. Nenhum produto foi importado.'));return;}if(product.barcode&&!product.archived)codes.set(product.barcode.toLowerCase(),product.id);store.put({...product,key:`${scope}:${product.id}`,scope,updatedAt:new Date().toISOString()});added++;}done(added);};});return added;
}
