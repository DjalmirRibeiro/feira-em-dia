import { moeda } from './core.js?v=6';
import { CATEGORIAS, validarProduto, filtrarProdutos, nomeApresentacao, produtosExemplo } from './catalog-core.js?v=6';
import { listarProdutos, salvarProduto, semearExemplos, prepararFoto, fotoParaBackup } from './catalog-store.js?v=6';

export function iniciarCatalogo(host) {
  const $ = selector => document.querySelector(selector);
  const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
  const button = (label, handler, cls = 'text-button') => { const node = el('button', cls, label); node.type = 'button'; node.addEventListener('click', handler); return node; };
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  let products = [], loadedScope = null, requestNumber = 0, draft = null, editorScope, editorRevision = 0, processing = 0, saving = false;
  const listUrls = [], editorUrls = [];
  const photoTasks = { photo: 0, labelPhoto: 0 };
  function revoke(urls) { while (urls.length) URL.revokeObjectURL(urls.pop()); }
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
    $('#catalog-status').textContent = 'Abrindo seu catálogo…'; products = []; render();
    try {
      const result = await listarProdutos(scope);
      if (request !== requestNumber || scope !== host.getScope()) return;
      products = result; loadedScope = scope; $('#catalog-status').textContent = ''; render();
    } catch (error) { if (request === requestNumber) $('#catalog-status').textContent = `${error.message} Suas listas e o carrinho continuam disponíveis.`; }
  }
  function previews() {
    revoke(editorUrls);
    for (const kind of ['photo', 'labelPhoto']) {
      const image = $(kind === 'photo' ? '#cat-photo-preview' : '#cat-label-preview');
      const remove = $(kind === 'photo' ? '#cat-remove-photo' : '#cat-remove-label');
      image.hidden = !draft?.[kind]; remove.hidden = !draft?.[kind]; image.removeAttribute('src');
      if (draft?.[kind]) { image.src = URL.createObjectURL(draft[kind]); editorUrls.push(image.src); }
    }
    $('#cat-photo-status').textContent = processing ? 'Preparando foto…' : draft?.photo || draft?.labelPhoto ? 'Foto preparada. Toque em Salvar produto para guardar.' : 'Fotos opcionais. Nenhuma imagem é enviada para um servidor.';
    $('#cat-save').disabled = saving || processing > 0;
  }
  function open(product = null, camera = false) {
    editorRevision++; processing = 0; saving = false; editorScope = host.getScope();
    draft = product ? { ...product } : { id: crypto.randomUUID(), photo: null, labelPhoto: null, archived: false };
    $('#catalog-form').reset(); $('#cat-error').textContent = '';
    $('#cat-title').textContent = product ? 'Seu produto' : 'Cadastrar produto';
    $('#cat-name').value = product?.name || ''; $('#cat-brand').value = product?.brand || '';
    $('#cat-presentation').value = product?.presentation || ''; $('#cat-category').value = product?.category || 'Alimentos';
    $('#cat-code').value = product?.barcode || ''; $('#cat-unit').value = product?.unit || 'un';
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
      const photo = await prepararFoto(file);
      if (revision === editorRevision && task === photoTasks[kind]) draft[kind] = photo;
    } catch (error) { if (revision === editorRevision && task === photoTasks[kind]) $('#cat-error').textContent = error.message; }
    finally { if (revision === editorRevision) { processing--; previews(); } }
  }
  $('#catalog-search').addEventListener('input', render); $('#catalog-category').addEventListener('change', render); $('#catalog-archived').addEventListener('change', render);
  $('#catalog-retry').addEventListener('click', () => refresh(true));
  $('#catalog-new').addEventListener('click', () => open()); $('#catalog-capture').addEventListener('click', () => open(null, true));
  $('#catalog-close').addEventListener('click', () => { if (!saving) $('#catalog-dialog').close(); });
  $('#catalog-dialog').addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  $('#catalog-dialog').addEventListener('close', () => { editorRevision++; draft = null; revoke(editorUrls); });
  for (const [buttonId, inputId, kind] of [
    ['cat-take-photo', 'cat-camera', 'photo'], ['cat-choose-photo', 'cat-gallery', 'photo'],
    ['cat-take-label', 'cat-label-camera', 'labelPhoto'], ['cat-choose-label', 'cat-label-gallery', 'labelPhoto']
  ]) {
    $(`#${buttonId}`).addEventListener('click', () => $(`#${inputId}`).click());
    $(`#${inputId}`).addEventListener('change', event => readPhoto(event, kind));
  }
  for (const [buttonId, kind] of [['cat-remove-photo', 'photo'], ['cat-remove-label', 'labelPhoto']]) $(`#${buttonId}`).addEventListener('click', () => { photoTasks[kind]++; draft[kind] = null; previews(); });
  $('#catalog-form').addEventListener('submit', async event => {
    event.preventDefault(); if (saving || processing || !draft) return;
    try {
      if (editorScope !== host.getScope()) throw new Error('A base de dados mudou. Feche o cadastro e tente novamente.');
      const validated = validarProduto({ id: draft.id, name: $('#cat-name').value, brand: $('#cat-brand').value, presentation: $('#cat-presentation').value,
        category: $('#cat-category').value, barcode: $('#cat-code').value, unit: $('#cat-unit').value, price: $('#cat-price').value,
        priceDate: $('#cat-date').value, storeName: $('#cat-store').value, archived: draft.archived });
      if (validated.barcode && products.some(p => p.id !== draft.id && !p.archived && p.barcode.toLowerCase() === validated.barcode.toLowerCase())) throw new Error('Este código já está em outro produto ativo. Edite o cadastro existente ou corrija o código.');
      const product = { ...draft, ...validated, photo: draft.photo || null, labelPhoto: draft.labelPhoto || null };
      saving = true; previews(); $('#catalog-close').disabled = true;
      await salvarProduto(editorScope, product);
      $('#catalog-dialog').close(); await refresh(true); host.notify('Produto e fotos salvos no catálogo deste navegador.');
    } catch (error) { $('#cat-error').textContent = error.message; }
    finally { saving = false; $('#catalog-close').disabled = false; if (draft) previews(); }
  });
  $('#catalog-examples').addEventListener('click', async () => {
    const button = $('#catalog-examples'); button.disabled = true;
    try {
      if (host.getScope() !== 'demo') { const entered = await host.enterDemo(); if (!entered) return; }
      await semearExemplos(produtosExemplo()); await refresh(true); host.notify('60 produtos fictícios disponíveis na base de demonstração. Seus produtos pessoais foram preservados.');
    } catch (error) { host.notify(error.message); }
    finally { button.disabled = false; }
  });
  return {
    refresh,
    async exportData() {
      const records = await listarProdutos(host.getScope());
      return Promise.all(records.map(async product => ({ ...product, photo: await fotoParaBackup(product.photo), labelPhoto: await fotoParaBackup(product.labelPhoto) })));
    }
  };
}
