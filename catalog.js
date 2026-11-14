import { moeda } from './core.js?v=8';
import { CATEGORIAS, validarProduto, filtrarProdutos, nomeApresentacao, produtosExemplo } from './catalog-core.js?v=8';
import { listarProdutos, salvarProduto, semearExemplos, prepararFoto, fotoParaBackup } from './catalog-store.js?v=8';
import { criarRecortador } from './crop.js?v=8';
import { extrairEtiqueta } from './recognition-core.js?v=8';

export function iniciarCatalogo(host) {
  const $ = selector => document.querySelector(selector);
  const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
  const button = (label, handler, cls = 'text-button') => { const node = el('button', cls, label); node.type = 'button'; node.addEventListener('click', handler); return node; };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  let products = [], loadedScope = null, requestNumber = 0, draft = null, editorScope, editorRevision = 0, processing = 0, saving = false;
  const listUrls = [], editorUrls = [];
  const photoTasks = { photo: 0, labelPhoto: 0 };
  const recortar = criarRecortador();
  let reading = false, readingJob = 0, reader, readingResult, existingProduct, abortReading;
  const manuallyEdited = new Set();
  function revoke(urls) { while (urls.length) URL.revokeObjectURL(urls.pop()); }
  async function examplesWithPhotos() {
    const response = await fetch('./assets/demo-sources.json'); if (!response.ok) throw new Error('Não foi possível carregar as imagens de exemplo.');
    const sources = await response.json();
    return Promise.all(produtosExemplo().map(async product => {
      const source = sources.find(row => row.id === product.id); if (!source) return product;
      if (!/^assets\/demo\/[a-z0-9-]+\.jpg$/.test(source.localPath)) throw new Error('Caminho de imagem inválido.');
      const image = await fetch(`./${source.localPath}`); if (!image.ok) throw new Error('Uma imagem de exemplo não pôde ser carregada.');
      return { ...product, photo: await image.blob(), imageSource: source };
    }));
  }
  for (const category of CATEGORIAS) {
    const option = el('option', '', category); option.value = category; $('#catalog-category').append(option);
    const editOption = el('option', '', category); editOption.value = category; $('#cat-category').append(editOption);
  }
  function render() {
    revoke(listUrls);
    const list = $('#catalog-list'); list.replaceChildren();
    const visible = filtrarProdutos(products, { search: $('#catalog-search').value, category: $('#catalog-category').value, archived: $('#catalog-archived').checked });
    const active = products.filter(product => !product.archived).length;
    $('#catalog-count').textContent = `${visible.length} resultados · ${active} produtos ativos`;
    $('#catalog-examples').textContent = host.getScope() === 'demo' ? 'Carregar 60 exemplos' : 'Experimentar com 60 exemplos';
    if (!visible.length) list.append(el('div', 'empty', products.length ? 'Nenhum produto corresponde a estes filtros.' : 'Seu catálogo começa aqui. Cadastre um produto com foto ou experimente os exemplos fictícios.'));
    for (const product of visible) {
      const card = el('article', 'catalog-card');
      if (product.photo) {
        const img = el('img', 'catalog-photo'); img.alt = `Foto de ${product.name}`; img.loading = 'lazy'; img.src = URL.createObjectURL(product.photo); listUrls.push(img.src); card.append(img);
      } else card.append(el('div', 'catalog-placeholder', 'Sem foto'));
      const content = el('div', 'catalog-content');
      content.append(el('span', 'catalog-category-label', product.category), el('h2', '', product.name));
      if (product.brand || product.presentation) content.append(el('p', '', [product.brand, product.presentation].filter(Boolean).join(' · ')));
      const price = product.priceCents == null ? 'Preço ainda não cadastrado' : `${moeda(product.priceCents)} / ${product.unit}`;
      content.append(el('strong', 'catalog-price', price));
      if (product.priceCents != null) content.append(el('small', '', `Referência de ${product.priceDate.split('-').reverse().join('/')}${product.storeName ? ` · ${product.storeName}` : ''}. Confira o preço atual.`));
      if (product.synthetic) content.append(el('small', 'catalog-fictitious', 'Exemplo fictício · código interno DEMO'));
      if (product.barcode) content.append(el('small', '', `Código: ${product.barcode}`));
      if (product.imageSource) {
        const credit = el('small', 'photo-credit', `Foto ilustrativa: ${product.imageSource.author} · ${product.imageSource.license}. Imagem adaptada. `);
        const source = el('a', '', 'Origem e licença'); source.href = product.imageSource.pageUrl; source.target = '_blank'; source.rel = 'noopener'; credit.append(source); content.append(credit);
        const licenseUrl = product.imageSource.licenseUrl?.replace(/^http:/, 'https:');
        if (/^https:\/\/(creativecommons\.org|commons\.wikimedia\.org)\//.test(licenseUrl || '')) { const license = el('a', '', ' · Texto da licença'); license.href = licenseUrl; license.target = '_blank'; license.rel = 'noopener'; credit.append(license); }
      }
      const actions = el('div', 'catalog-actions');
      if (!product.archived) actions.append(button('Adicionar à lista +', () => host.addToList(product), 'button dark'));
      actions.append(button('Ver / editar', () => open(product)), button(product.archived ? 'Restaurar' : 'Arquivar', async () => {
        const scope = host.getScope();
        try { await salvarProduto(scope, { ...product, archived: !product.archived }); await refresh(true); host.notify(product.archived ? 'Produto restaurado.' : 'Produto arquivado. Para restaurar, marque “Ver arquivados”.'); }
        catch (error) { host.notify(error.message); }
      }));
      content.append(actions); card.append(content); list.append(card);
    }
  }
  async function refresh(force = false) {
    const scope = host.getScope();
    if (!force && loadedScope === scope) return;
    const request = ++requestNumber;
    loadedScope = null;
    $('#catalog-status').textContent = 'Abrindo seu catálogo…'; products = []; render(); host.onCatalogChanged?.([]);
    try {
      const result = await listarProdutos(scope);
      if (request !== requestNumber || scope !== host.getScope()) return;
      products = result; loadedScope = scope; $('#catalog-status').textContent = ''; render(); host.onCatalogChanged?.(products);
    } catch (error) { if (request === requestNumber) $('#catalog-status').textContent = `${error.message} Suas listas e o carrinho continuam disponíveis.`; }
  }
  function previews() {
    revoke(editorUrls);
    for (const kind of ['photo', 'labelPhoto']) {
      const image = $(kind === 'photo' ? '#cat-photo-preview' : '#cat-label-preview');
      const remove = $(kind === 'photo' ? '#cat-remove-photo' : '#cat-remove-label');
      image.hidden = !draft?.[kind]; remove.hidden = !draft?.[kind]; image.removeAttribute('src');
      $(kind === 'photo' ? '#cat-crop-photo' : '#cat-crop-label').hidden = !draft?.[kind];
      const readButton = $(kind === 'photo' ? '#cat-read-photo' : '#cat-read-label'); readButton.hidden = !draft?.[kind]; readButton.disabled = reading || processing > 0;
      const aiButton=$(kind==='photo'?'#cat-ai-photo':'#cat-ai-label');aiButton.hidden=!draft?.[kind]||!host.aiAvailable?.();aiButton.disabled=reading||processing>0;
      if (draft?.[kind]) { image.src = URL.createObjectURL(draft[kind]); editorUrls.push(image.src); }
    }
    $('#cat-photo-status').textContent = processing ? 'Preparando foto…' : draft?.photo || draft?.labelPhoto ? 'Foto preparada. Toque em Salvar produto para guardar.' : 'Fotos opcionais. Nenhuma imagem é enviada para um servidor.';
    $('#cat-save').disabled = saving || processing > 0 || reading;
    $('#cat-save-list').disabled = saving || processing > 0 || reading;
  }
  function open(product = null, camera = false) {
    editorRevision++; processing = 0; saving = false; editorScope = host.getScope();
    manuallyEdited.clear();
    readingResult = null; existingProduct = null; $('#cat-recognition').hidden = true;
    draft = product ? { ...product } : { id: crypto.randomUUID(), photo: null, labelPhoto: null, archived: false };
    $('#catalog-form').reset(); $('#cat-error').textContent = '';
    $('#cat-title').textContent = product ? 'Seu produto' : 'Cadastrar produto';
    $('#cat-name').value = product?.name || ''; $('#cat-brand').value = product?.brand || '';
    $('#cat-presentation').value = product?.presentation || ''; $('#cat-category').value = product?.category || 'Alimentos';
    $('#cat-code').value = product?.barcode || ''; $('#cat-unit').value = product?.unit || 'un';
    $('#cat-content-quantity').value=product?.contentQuantity==null?'':String(product.contentQuantity).replace('.',',');$('#cat-content-unit').value=product?.contentUnit||'un';
    $('#cat-stock-content').checked=Boolean(product?.stockByContent);
    $('#cat-price').value = product?.priceCents == null ? '' : (product.priceCents / 100).toFixed(2).replace('.', ',');
    $('#cat-date').value = product?.priceDate || today(); $('#cat-store').value = product?.storeName || '';
    previews(); $('#catalog-dialog').showModal();
    if (camera) $('#cat-camera').click();
  }
  async function readPhoto(event, kind) {
    const input = event.target, file = input.files?.[0]; input.value = '';
    if (!file || !draft) return;
    const revision = editorRevision, task = ++photoTasks[kind]; processing++; previews(); $('#cat-error').textContent = '';
    try {
      const photo = await recortar(file);
      if (photo && revision === editorRevision && task === photoTasks[kind]) {
        draft[kind] = photo;
        if (kind === 'photo') delete draft.imageSource;
        if ($('#cat-auto-read').checked) await analyze(kind);
      }
    } catch (error) { if (revision === editorRevision && task === photoTasks[kind]) $('#cat-error').textContent = error.message; }
    finally { if (revision === editorRevision) { processing--; previews(); } }
  }
  $('#catalog-search').addEventListener('input', render); $('#catalog-category').addEventListener('change', render); $('#catalog-archived').addEventListener('change', render);
  $('#catalog-retry').addEventListener('click', () => refresh(true));
  $('#catalog-new').addEventListener('click', () => open()); $('#catalog-capture').addEventListener('click', () => open(null, true));
  $('#catalog-close').addEventListener('click', () => { if (!saving) $('#catalog-dialog').close(); });
  $('#catalog-dialog').addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  $('#catalog-dialog').addEventListener('close', () => { editorRevision++; cancelReading(); draft = null; revoke(editorUrls); });
  async function cancelReading() { readingJob++; reading = false; abortReading?.(); abortReading = null; $('#cat-read-cancel').hidden = true; if (reader) await reader.cancelarLeitura(); if (draft) previews(); }
  function applyReading(onlyEmpty = false) {
    if (!readingResult || !draft) return;
    const result = readingResult;
    const candidates = { 'cat-name': existingProduct?.name || result.name, 'cat-brand': existingProduct?.brand || result.brand,
      'cat-presentation': existingProduct?.presentation || result.presentation, 'cat-code': result.barcode };
    for (const [id, value] of Object.entries(candidates)) if (value && (!onlyEmpty || !manuallyEdited.has(id) && !document.getElementById(id).value.trim())) document.getElementById(id).value = value;
    if (!onlyEmpty || !manuallyEdited.has('cat-price') && !$('#cat-price').value.trim()) {
      const value = $('#cat-read-price').value;
      if (value) { $('#cat-price').value = (Number(value) / 100).toFixed(2).replace('.', ','); $('#cat-date').value = today(); }
    }
    if (existingProduct) { if (!onlyEmpty || !manuallyEdited.has('cat-category')) $('#cat-category').value = existingProduct.category; if (!onlyEmpty || !manuallyEdited.has('cat-unit')) $('#cat-unit').value = existingProduct.unit; }
    else if (result.unit && (!onlyEmpty || !manuallyEdited.has('cat-unit'))) $('#cat-unit').value = result.unit;
  }
  async function analyze(kind) {
    if (!draft?.[kind] || reading) return;
    const revision = editorRevision, job = ++readingJob; reading = true;
    $('#cat-recognition').hidden = false; $('#cat-read-results').hidden = true; $('#cat-read-cancel').hidden = false;
    $('#cat-read-status').textContent = 'Preparando leitor local. O primeiro uso precisa de internet e pode demorar alguns segundos.'; previews();
    const valid = () => draft && revision === editorRevision && job === readingJob;
    let timeout;
    const cancelled = new Promise(resolve => { abortReading = () => resolve(null); });
    const expired = new Promise((resolve, reject) => { timeout = setTimeout(() => reject(new Error('Tempo de leitura excedido.')), 60000); });
    try {
      reader = await Promise.race([import('./vendor/v7/recognition.js'), cancelled, expired]);
      if (!reader) return;
      if (!valid()) return;
      const report = event => { if (valid()) $('#cat-read-status').textContent = event.status === 'recognizing text' ? `Lendo texto… ${Math.round((event.progress || 0) * 100)}%` : 'Carregando leitor e idioma português…'; };
      const results = await Promise.race([Promise.allSettled([reader.lerTexto(draft[kind], report), reader.lerCodigo(draft[kind])]), cancelled, expired]);
      if (!valid() || !results) return;
      const text = results[0].status === 'fulfilled' ? results[0].value.text : '';
      readingResult = extrairEtiqueta(text);
      if (results[1].status === 'fulfilled' && /^[A-Za-z0-9 -]{4,48}$/.test(results[1].value)) readingResult.barcode = results[1].value;
      existingProduct = readingResult.barcode ? products.find(product => !product.archived && product.barcode === readingResult.barcode && product.id !== draft.id) : null;
      $('#cat-read-text').value = text;
      const select = $('#cat-read-price'); select.replaceChildren();
      const empty = el('option', '', 'Não preencher preço / escolher depois'); empty.value = ''; select.append(empty);
      for (const candidate of readingResult.prices) { const option = el('option', '', `${moeda(candidate.cents)}${candidate.conditional ? ' · condição especial' : ''} — ${candidate.label.slice(0, 80)}`); option.value = candidate.cents; select.append(option); }
      if (!readingResult.ambiguous) select.value = String(readingResult.prices[0].cents);
      $('#cat-read-summary').textContent = [existingProduct || readingResult.name ? `Nome sugerido: ${existingProduct?.name || readingResult.name}.` : 'Nome não identificado.', readingResult.barcode ? `Código: ${readingResult.barcode}.` : 'Código não encontrado; tente uma foto mais próxima das barras.', readingResult.ambiguous && readingResult.prices.length ? 'Confira as condições e escolha o preço correto.' : 'Confira os campos antes de salvar.'].join(' ');
      $('#cat-read-results').hidden = false;
      $('#cat-use-existing').hidden = !existingProduct; $('#cat-existing-message').hidden = !existingProduct;
      $('#cat-existing-message').textContent = existingProduct ? `Este código já está no catálogo: ${nomeApresentacao(existingProduct)}.` : '';
      if (results[0].status === 'fulfilled' && results[0].value.confidence >= 35 || readingResult.barcode) applyReading(true);
      $('#cat-read-status').textContent = results[0].status === 'rejected' ? 'O texto não pôde ser lido. O resultado do código, se encontrado, continua disponível.' : 'Leitura concluída. Campos vazios foram sugeridos; revise antes de salvar.';
    } catch { if (valid()) { $('#cat-read-status').textContent = 'A leitura não foi concluída. Verifique a conexão ou tente uma foto mais próxima; você pode preencher os campos manualmente.'; reader?.cancelarLeitura(); } }
    finally { clearTimeout(timeout); if (valid()) { abortReading = null; reading = false; $('#cat-read-cancel').hidden = true; previews(); } }
  }
  $('#cat-read-cancel').addEventListener('click', () => { cancelReading(); $('#cat-read-status').textContent = 'Leitura cancelada. A foto e os campos preenchidos foram mantidos.'; });
  $('#cat-apply-reading').addEventListener('click', () => applyReading(false));
  $('#catalog-form').addEventListener('input', event => { if (event.target.id) manuallyEdited.add(event.target.id); });
  $('#cat-read-price').addEventListener('change', () => { const value = $('#cat-read-price').value; $('#cat-price').value = value ? (Number(value) / 100).toFixed(2).replace('.', ',') : ''; if (value) $('#cat-date').value = today(); manuallyEdited.add('cat-price'); });
  $('#cat-use-existing').addEventListener('click', () => {
    if (!existingProduct || !draft) return;
    const capturedSource = draft.imageSource, capturedPhoto = draft.photo;
    draft = { ...existingProduct, photo: draft.photo || existingProduct.photo, labelPhoto: draft.labelPhoto || existingProduct.labelPhoto };
    if (capturedPhoto) { if (capturedSource) draft.imageSource = capturedSource; else delete draft.imageSource; }
    if (!$('#cat-price').value.trim() && existingProduct.priceCents != null) { $('#cat-price').value = (existingProduct.priceCents / 100).toFixed(2).replace('.', ','); $('#cat-date').value = existingProduct.priceDate; $('#cat-store').value = existingProduct.storeName || ''; }
    $('#cat-title').textContent = 'Atualizar produto cadastrado'; applyReading(true); $('#cat-existing-message').textContent = 'Salvar atualizará o cadastro existente com as fotos e os campos revisados.'; $('#cat-use-existing').hidden = true; previews();
  });
  for (const [kind, cropId, readId] of [['photo', 'cat-crop-photo', 'cat-read-photo'], ['labelPhoto', 'cat-crop-label', 'cat-read-label']]) {
    $(`#${readId}`).addEventListener('click', () => analyze(kind));
    $(`#${cropId}`).addEventListener('click', async () => {
      if (!draft?.[kind] || reading || processing) return;
      const revision = editorRevision; processing++; previews();
      try { const result = await recortar(draft[kind]); if (result && revision === editorRevision) { draft[kind] = result; if (kind === 'photo' && draft.imageSource) draft.imageSource = { ...draft.imageSource, changes: 'Imagem recortada pelo usuário.' }; if ($('#cat-auto-read').checked) await analyze(kind); } }
      catch (error) { if (revision === editorRevision) $('#cat-error').textContent = error.message; }
      finally { if (revision === editorRevision) { processing--; previews(); } }
    });
  }
  for(const [kind,id]of [['photo','cat-ai-photo'],['labelPhoto','cat-ai-label']])$(`#${id}`).addEventListener('click',async()=>{if(!draft?.[kind]||reading||processing)return;const revision=editorRevision;processing++;previews();$('#cat-recognition').hidden=false;$('#cat-read-status').textContent='Enviando a imagem recortada ao serviço conectado e à OpenAI…';try{const product=await host.analyzeImage(draft[kind]);if(revision!==editorRevision)return;for(const [key,field]of [['name','cat-name'],['brand','cat-brand'],['presentation','cat-presentation'],['barcode','cat-code']])if(product[key]&&!manuallyEdited.has(field)&&!document.getElementById(field).value.trim())document.getElementById(field).value=product[key];if(product.priceCents!=null&&!manuallyEdited.has('cat-price')&&!$('#cat-price').value.trim()){$('#cat-price').value=(product.priceCents/100).toFixed(2).replace('.',',');$('#cat-date').value=today();}if(!manuallyEdited.has('cat-unit'))$('#cat-unit').value=product.unit;if(!manuallyEdited.has('cat-category'))$('#cat-category').value=product.category;$('#cat-read-status').textContent='Sugestões da OpenAI recebidas. Campos já preenchidos foram mantidos; revise os dados antes de salvar.';}catch(error){if(revision===editorRevision)$('#cat-read-status').textContent=error.message;}finally{if(revision===editorRevision){processing--;previews();}}});
  for (const [buttonId, inputId, kind] of [
    ['cat-take-photo', 'cat-camera', 'photo'], ['cat-choose-photo', 'cat-gallery', 'photo'],
    ['cat-take-label', 'cat-label-camera', 'labelPhoto'], ['cat-choose-label', 'cat-label-gallery', 'labelPhoto']
  ]) {
    $(`#${buttonId}`).addEventListener('click', () => $(`#${inputId}`).click());
    $(`#${inputId}`).addEventListener('change', event => readPhoto(event, kind));
  }
  for (const [buttonId, kind] of [['cat-remove-photo', 'photo'], ['cat-remove-label', 'labelPhoto']]) $(`#${buttonId}`).addEventListener('click', () => { photoTasks[kind]++; draft[kind] = null; previews(); });
  $('#catalog-form').addEventListener('submit', async event => {
    event.preventDefault(); if (saving || processing || reading || !draft) return;
    const addToList = event.submitter?.id === 'cat-save-list';
    try {
      if (editorScope !== host.getScope()) throw new Error('A base de dados mudou. Feche o cadastro e tente novamente.');
      const validated = validarProduto({ id: draft.id, name: $('#cat-name').value, brand: $('#cat-brand').value, presentation: $('#cat-presentation').value,
        category: $('#cat-category').value, barcode: $('#cat-code').value, unit: $('#cat-unit').value, price: $('#cat-price').value,
        priceDate: $('#cat-date').value, storeName: $('#cat-store').value, archived: draft.archived,contentQuantity:$('#cat-content-quantity').value,contentUnit:$('#cat-content-unit').value,stockByContent:$('#cat-stock-content').checked });
      if (validated.barcode && products.some(p => p.id !== draft.id && !p.archived && p.barcode.toLowerCase() === validated.barcode.toLowerCase())) throw new Error('Este código já está em outro produto ativo. Edite o cadastro existente ou corrija o código.');
      const product = { ...draft, ...validated, photo: draft.photo || null, labelPhoto: draft.labelPhoto || null };
      saving = true; previews(); $('#catalog-close').disabled = true;
      await salvarProduto(editorScope, product);
      $('#catalog-dialog').close(); await refresh(true); host.notify('Produto e fotos salvos no catálogo deste navegador.');
      if (addToList) host.addToList(product);
    } catch (error) { $('#cat-error').textContent = error.message; }
    finally { saving = false; $('#catalog-close').disabled = false; if (draft) previews(); }
  });
  $('#catalog-examples').addEventListener('click', async () => {
    const button = $('#catalog-examples'); button.disabled = true;
    try {
      if (host.getScope() !== 'demo') { const entered = await host.enterDemo(); if (!entered) return; }
      await semearExemplos(await examplesWithPhotos()); await refresh(true); host.notify('60 produtos fictícios disponíveis, com 12 fotos ilustrativas da internet e seus créditos. Seus produtos pessoais foram preservados.');
    } catch (error) { host.notify(error.message); }
    finally { button.disabled = false; }
  });
  $('#catalog-photo-list').addEventListener('click', async () => {
    const button = $('#catalog-photo-list'); button.disabled = true;
    try {
      if (host.getScope() !== 'demo' && !await host.enterDemo()) return;
      const examples = await examplesWithPhotos(); await semearExemplos(examples); await refresh(true);
      const illustratedIds = new Set(examples.filter(product => product.photo).map(product => product.id));
      await host.createDemoList(products.filter(product => illustratedIds.has(product.id) && !product.archived));
    } catch (error) { host.notify(error.message); }
    finally { button.disabled = false; }
  });
  return {
    refresh,
    refreshAIState:()=>{if(draft)previews();},
    capture:()=>open(null,true),
    async seedDemo(){await semearExemplos(await examplesWithPhotos());await refresh(true);},
    async exportData() {
      const records = await listarProdutos(host.getScope());
      return Promise.all(records.map(async product => ({ ...product, photo: await fotoParaBackup(product.photo), labelPhoto: await fotoParaBackup(product.labelPhoto) })));
    }
  };
}
