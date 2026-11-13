import { criarItem, criarPlanejado, subtotal, total, moeda, exemplos, comprado, restante, colocarPlanejado, editarCarrinho, planejarCompra, migrarEstado } from './core.js?v=7';
import { iniciarCatalogo } from './catalog.js?v=7';
import { nomeApresentacao } from './catalog-core.js?v=7';

const $ = selector => document.querySelector(selector);
const REAL_KEY = 'feira-em-dia:v1';
const DEMO_KEY = 'feira-em-dia:demo:v2';
const MODE_KEY = 'feira-em-dia:mode';
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const novoEstado = () => ({ version: 2, cart: [], planned: [], history: [], market: '', date: hoje(), demo: false });
const uid = () => crypto.randomUUID();
const quantidade = value => value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
let storageFailed = false;
let demoMode = false;
try { demoMode = localStorage.getItem(MODE_KEY) === 'demo'; } catch { storageFailed = true; }
function load(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return novoEstado();
    const saved = JSON.parse(raw);
    if (saved.version === 1 && !localStorage.getItem(`${REAL_KEY}:backup-v1`)) localStorage.setItem(`${REAL_KEY}:backup-v1`, raw);
    return migrarEstado(saved, hoje());
  } catch { storageFailed = true; return novoEstado(); }
}
let state = load(demoMode ? DEMO_KEY : REAL_KEY);
let currentView = 'inicio';
let currentBucket = 'planned';
let editBucket = 'planned';
let toastTimer;
let catalogUI;
let catalogProducts = new Map();
const planPhotoUrls = [], cartPhotoUrls = [];
function clearPhotos(urls) { while (urls.length) URL.revokeObjectURL(urls.pop()); }
function itemPhoto(item, urls) {
  const product = catalogProducts.get(item.catalogId);
  if (!product?.photo) return null;
  const image = document.createElement('img'); image.className = 'item-thumbnail'; image.alt = `Foto ilustrativa de ${item.name}`; image.loading = 'lazy'; image.src = URL.createObjectURL(product.photo); urls.push(image.src); return image;
}
function notify(message) {
  const formError = document.querySelector('dialog[open] .form-error');
  if (formError) { formError.textContent = message; return; }
  $('#toast').textContent = message; $('#toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 9000);
}
function confirmar(message) {
  const dialog = $('#confirm-dialog'); $('#confirm-message').textContent = message;
  dialog.returnValue = 'cancel';
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.showModal();
  });
}
function save() {
  if (storageFailed) { notify('Os dados anteriores não puderam ser lidos. Não vamos sobrescrevê-los; exporte esta sessão antes de fechar.'); return false; }
  try { localStorage.setItem(demoMode ? DEMO_KEY : REAL_KEY, JSON.stringify(state)); return true; }
  catch { notify('Não foi possível salvar neste navegador. Exporte os dados antes de fechar.'); return false; }
}
function show(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== `view-${view}`; });
  document.querySelectorAll('[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
    if (el.dataset.view === view) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  });
  $('#shopping-bar').hidden = view !== 'carrinho';
  document.body.classList.toggle('shopping-active', view === 'carrinho');
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function bucket(value) {
  currentBucket = value;
  $('#planned-panel').hidden = value !== 'planned'; $('#cart-panel').hidden = value !== 'cart';
  $('#show-planned').setAttribute('aria-pressed', String(value === 'planned'));
  $('#show-cart').setAttribute('aria-pressed', String(value === 'cart'));
}
const node = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
function action(label, fn, cls = 'text-button') {
  const button = node('button', cls, label); button.type = 'button'; button.addEventListener('click', fn); return button;
}
function undo(message, restore) {
  notify(message);
  $('#toast').append(action('Desfazer', () => { restore(); save(); render(); $('#toast').hidden = true; }));
}
function openProduct(destination = currentBucket, item = null, fromCatalog = null) {
  editBucket = destination;
  const source = item || (fromCatalog ? { ...fromCatalog, name: nomeApresentacao(fromCatalog), quantity: 1 } : null);
  $('#item-form').reset(); $('#edit-id').value = item?.id || '';
  $('#catalog-id').value = item?.catalogId || fromCatalog?.id || '';
  $('#destination').value = destination; $('#destination').disabled = Boolean(item);
  $('#form-title').textContent = item ? 'Editar produto' : 'Adicionar produto';
  $('#product').value = source?.name || ''; $('#unit').value = source?.unit || 'un';
  $('#quantity').value = source ? String(source.quantity).replace('.', ',') : '1';
  $('#price').value = source?.priceCents != null ? (source.priceCents / 100).toFixed(2).replace('.', ',') : '';
  const linked = destination === 'cart' && Boolean(item?.planId);
  $('#product').readOnly = linked; $('#unit').disabled = linked;
  $('#item-error').textContent = ''; updateDestination(); $('#item-dialog').showModal();
}
function updateDestination() {
  const planned = $('#destination').value === 'planned';
  $('#price').required = !planned;
  $('#price-help').textContent = planned ? 'Preço opcional para planejar. Ao pegar o produto, informe o preço atual.' : 'Informe o preço atual. Este produto entrará no total do carrinho.';
  $('#submit-item').textContent = $('#edit-id').value ? 'Salvar alteração' : planned ? 'Adicionar à lista +' : 'Adicionar ao carrinho +';
}
function pick(plan) {
  $('#pick-error').textContent = '';
  $('#pick-id').value = plan.id; $('#pick-title').textContent = plan.name;
  $('#pick-context').textContent = `Faltam ${quantidade(restante(plan, state.cart))} ${plan.unit}. Pode pegar só uma parte agora.`;
  $('#pick-quantity').value = String(restante(plan, state.cart)).replace('.', ',');
  $('#pick-price').value = plan.priceCents == null ? '' : (plan.priceCents / 100).toFixed(2).replace('.', ',');
  $('#pick-dialog').showModal();
}
function renderPlans() {
  clearPhotos(planPhotoUrls);
  const list = $('#planned-items'); list.replaceChildren();
  if (!state.planned.length) list.append(node('div', 'empty', 'Sua lista está vazia. Adicione o que pretende comprar ou crie uma lista a partir do histórico.'));
  for (const plan of state.planned) {
    const left = restante(plan, state.cart), taken = comprado(plan, state.cart);
    const card = node('article', `plan-card${left === 0 ? ' plan-resolved' : ''}`);
    const heading = node('div', 'plan-heading');
    const info = node('div'); info.append(node('h3', '', plan.name), node('p', '', `Planejado: ${quantidade(plan.quantity)} ${plan.unit} · Peguei: ${quantidade(taken)} ${plan.unit}`));
    const status = plan.skipped ? 'Dispensado nesta compra' : left === 0 ? 'Tudo no carrinho ✓' : `Faltam ${quantidade(left)} ${plan.unit}`;
    const productHeading = node('div', 'plan-product'), photo = itemPhoto(plan, planPhotoUrls); if (photo) productHeading.append(photo); productHeading.append(info);
    heading.append(productHeading, node('span', `plan-status${left === 0 ? ' resolved' : ''}`, status)); card.append(heading);
    card.append(node('p', 'plan-price', plan.priceCents == null ? 'Preço ainda não informado' : `Referência: ${moeda(plan.priceCents)} / ${plan.unit} · conferir na loja`));
    const actions = node('div', 'plan-actions');
    if (left > 0) actions.append(action('Pegar produto →', () => pick(plan), 'button dark'));
    if (plan.skipped) actions.append(action('Voltar para a lista', () => { plan.skipped = false; save(); render(); }));
    else if (left > 0) actions.append(action('Não levar agora', () => { plan.skipped = true; save(); render(); undo('Produto dispensado apenas nesta compra.', () => { plan.skipped = false; }); }));
    actions.append(action('Editar lista', () => openProduct('planned', plan)), action('Excluir da lista', () => {
      if (taken > 0) return notify('Retire as quantidades vinculadas do carrinho antes de excluir este item da lista.');
      const index = state.planned.findIndex(item => item.id === plan.id); state.planned.splice(index, 1); save(); render();
      undo('Produto removido da lista.', () => state.planned.splice(Math.min(index, state.planned.length), 0, plan));
    }));
    card.append(actions); list.append(card);
  }
}
function renderCart() {
  clearPhotos(cartPhotoUrls);
  const list = $('#items'); list.replaceChildren();
  if (!state.cart.length) list.append(node('div', 'empty', 'Seu carrinho está vazio. Pegue um produto da lista ou adicione aqui o que já colocou no carrinho.'));
  for (const item of state.cart) {
    const row = node('article', 'item-row');
    const details = node('div', 'item-details'); details.append(node('strong', '', item.name), node('small', '', `${quantidade(item.quantity)} ${item.unit} × ${moeda(item.priceCents)}${item.planId ? ' · da sua lista' : ' · item extra'}`));
    const actions = node('div', 'item-actions');
    actions.append(action('Editar', () => openProduct('cart', item)), action('Excluir', () => {
      const index = state.cart.findIndex(i => i.id === item.id); state.cart.splice(index, 1); save(); render();
      undo('Produto retirado do carrinho. A lista foi atualizada.', () => {
        // Não restaurar um vínculo que foi excluído depois da remoção.
        state.cart.splice(Math.min(index, state.cart.length), 0, { ...item, ...(item.planId && !state.planned.some(p => p.id === item.planId) ? { planId: undefined } : {}) });
      });
    }));
    row.append(itemPhoto(item, cartPhotoUrls) || node('span', 'product-mark', '▧'), details, node('strong', 'item-price', moeda(subtotal(item))), actions); list.append(row);
  }
}
function renderHistory() {
  const history = $('#history-list'); history.replaceChildren();
  if (!state.history.length) history.append(node('div', 'empty', 'As compras concluídas aparecerão aqui, com data, supermercado e total.'));
  for (const purchase of [...state.history].reverse()) {
    const card = node('article', 'history-card panel'), heading = node('div', 'history-heading'), info = node('div');
    info.append(node('h2', '', purchase.market || 'Supermercado não informado'), node('p', '', `${new Date(`${purchase.date}T12:00:00`).toLocaleDateString('pt-BR')} · ${purchase.items.length} produtos${purchase.demo ? ' · DEMONSTRAÇÃO FICTÍCIA' : ''}`));
    heading.append(info, node('strong', '', moeda(total(purchase.items))));
    const details = node('details'); details.append(node('summary', '', 'Ver produtos comprados'));
    for (const item of purchase.items) details.append(node('p', '', `${item.name} · ${quantidade(item.quantity)} ${item.unit} · ${moeda(subtotal(item))}`));
    const missing = (purchase.planned || []).filter(plan => restante(plan, purchase.items) > 0);
    if (missing.length) details.append(node('p', '', `Ficaram pendentes: ${missing.map(p => `${p.name} (${quantidade(restante(p, purchase.items))} ${p.unit})`).join(', ')}.`));
    card.append(heading, details, action('Planejar nova compra →', async () => {
      if ((state.cart.length || state.planned.length) && !(await confirmar('Substituir a lista e o carrinho atuais por um novo planejamento? O histórico será preservado.'))) return;
      // Compras antigas de demonstração não são copiadas para a base pessoal.
      if (purchase.demo && !demoMode) {
        if (!save()) return;
        demoMode = true; localStorage.setItem(MODE_KEY, 'demo'); state = load(DEMO_KEY);
      }
      state.planned = planejarCompra(purchase, uid); state.cart = []; state.market = purchase.market;
      state.date = hoje(); state.demo = demoMode; save(); render(); bucket('planned'); show('carrinho');
      notify('Nova lista criada. O carrinho começa vazio; confira os preços ao pegar os produtos.');
    })); history.append(card);
  }
}
function render() {
  const sum = total(state.cart), pending = state.planned.filter(plan => restante(plan, state.cart) > 0);
  const expected = pending.filter(plan => plan.priceCents != null).reduce((sum, plan) => sum + Math.round(plan.priceCents * restante(plan, state.cart)), 0);
  const unknown = pending.filter(plan => plan.priceCents == null).length;
  $('#home-total').textContent = $('#cart-total').textContent = $('#sticky-total').textContent = moeda(sum);
  $('#nav-count').textContent = $('#item-count').textContent = state.cart.length;
  $('#planned-count').textContent = pending.length;
  $('#plan-progress').textContent = `${pending.length} pendentes · ${state.planned.length} planejados`;
  $('#sticky-pending').textContent = pending.length ? `${pending.length} produtos pendentes` : 'Nenhum produto pendente';
  $('#home-items').textContent = `${state.cart.length} produtos no carrinho · ${pending.length} pendentes${demoMode || state.demo ? ' · demonstração' : ''}`;
  $('#summary-count').textContent = `${state.cart.length} produtos no carrinho · ${pending.length} pendentes`;
  $('#remaining-estimate').textContent = pending.length ? `Falta comprar: ${moeda(expected)} estimados${unknown ? ` + ${unknown} produtos sem preço` : ''}.` : 'Sua lista não tem pendências.';
  $('#market').value = state.market; $('#purchase-date').value = state.date;
  $('#purchase-caption').textContent = state.market || 'Informar local da compra';
  $('#finish').disabled = state.cart.length === 0;
  $('#shopping-demo').hidden = demoMode || !state.demo;
  $('#leave-demo').hidden = !demoMode;
  $('#demo-mode-banner').hidden = !demoMode;
  $('#demo').textContent = demoMode ? 'Reiniciar exemplos' : 'Experimentar com exemplos';
  const month = demoMode ? [] : state.history.filter(p => p.date.startsWith(hoje().slice(0, 7)) && !p.demo);
  $('#month-total').textContent = moeda(month.reduce((sum, purchase) => sum + total(purchase.items), 0));
  $('#month-count').textContent = demoMode ? 'Indicadores reais não são alterados no modo de exemplo' : `${month.length} compras reais registradas neste mês`;
  $('#history-count').textContent = demoMode ? '—' : state.history.filter(p => !p.demo).length;
  renderPlans(); renderCart(); renderHistory(); bucket(currentBucket); catalogUI?.refresh();
}

document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => show(el.dataset.view)));
document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => show(el.dataset.go)));
$('#show-planned').addEventListener('click', () => bucket('planned'));
$('#show-cart').addEventListener('click', () => bucket('cart'));
$('#add-product').addEventListener('click', () => openProduct()); $('#sticky-add').addEventListener('click', () => openProduct());
$('#open-catalog').addEventListener('click', () => show('catalogo'));
$('#item-use-catalog').addEventListener('click', () => { $('#item-dialog').close(); show('catalogo'); });
$('#close-item').addEventListener('click', () => $('#item-dialog').close()); $('#close-pick').addEventListener('click', () => $('#pick-dialog').close());
$('#destination').addEventListener('change', updateDestination);
$('#item-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const editId = $('#edit-id').value, destination = editId ? editBucket : $('#destination').value;
    const input = { id: editId || uid(), name: $('#product').value, price: $('#price').value, quantity: $('#quantity').value, unit: $('#unit').value };
    if (destination === 'planned') {
      const plan = { ...criarPlanejado(input), ...($('#catalog-id').value ? { catalogId: $('#catalog-id').value } : {}) }, old = state.planned.find(p => p.id === editId);
      if (old && comprado(old, state.cart) > 0 && (plan.name !== old.name || plan.unit !== old.unit)) throw new Error('Não é possível trocar nome ou unidade de um produto já pego. Retire-o do carrinho primeiro.');
      if (old && Math.round(plan.quantity * 1000) < Math.round(comprado(old, state.cart) * 1000)) throw new Error('A quantidade planejada não pode ser menor que a quantidade no carrinho.');
      if (old) state.planned = state.planned.map(p => p.id === editId ? { ...plan, skipped: old.skipped } : p); else state.planned.push(plan);
    } else {
      const item = { ...criarItem(input), ...($('#catalog-id').value ? { catalogId: $('#catalog-id').value } : {}) };
      if (editId) state = editarCarrinho(state, item); else state.cart.push(item);
    }
    const saved = save(); $('#item-dialog').close(); bucket(destination); render();
    if (saved) notify(editId ? 'Produto atualizado.' : destination === 'planned' ? 'Produto adicionado à lista. O total do carrinho não mudou.' : 'Produto adicionado ao carrinho.');
  } catch (error) { notify(error.message); }
});
$('#pick-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    state = colocarPlanejado(state, { planId: $('#pick-id').value, quantity: $('#pick-quantity').value, price: $('#pick-price').value, id: uid() });
    const saved = save(); $('#pick-dialog').close(); render(); if (saved) notify('Produto no carrinho. Quantidade pendente e total atualizados.');
  } catch (error) { notify(error.message); }
});
$('#market').addEventListener('change', event => { state.market = event.target.value.trim(); save(); render(); });
$('#purchase-date').addEventListener('change', event => { if (event.target.value) { state.date = event.target.value; save(); } });
$('#what-missing').addEventListener('click', () => {
  bucket('planned'); const pending = state.planned.filter(p => restante(p, state.cart) > 0);
  notify(!state.planned.length ? 'Sua lista está vazia. Adicione os produtos que pretende comprar.' : !pending.length ? 'Não há pendências: os produtos foram pegos ou dispensados nesta compra.' : `Faltam ${pending.length} produtos: ${pending.slice(0, 5).map(p => `${p.name}: ${quantidade(restante(p, state.cart))} ${p.unit}`).join('; ')}${pending.length > 5 ? '; veja os demais na lista.' : '.'}`);
});
$('#demo').addEventListener('click', async () => {
  if (demoMode && !(await confirmar('Reiniciar apenas os dados fictícios? Suas compras pessoais serão preservadas.'))) return;
  if (!save()) return;
  demoMode = true; localStorage.setItem(MODE_KEY, 'demo');
  state = { ...novoEstado(), demo: true, market: 'Mercado Jardim · fictício', planned: exemplos().map(p => ({ ...p, id: uid(), skipped: false })) };
  state.planned.push(criarPlanejado({ id: uid(), name: 'Feijão carioca', price: '', quantity: '2', unit: 'kg' }));
  save(); render(); bucket('planned'); notify('Exemplos carregados em uma base separada. Seus dados pessoais foram preservados.');
});
function leaveDemo() {
  if (!save()) return;
  demoMode = false; localStorage.setItem(MODE_KEY, 'real'); state = load(REAL_KEY); render(); bucket('planned'); notify('Você voltou às suas compras pessoais.');
}
$('#leave-demo').addEventListener('click', leaveDemo); $('#leave-demo-global').addEventListener('click', leaveDemo);
$('#finish').addEventListener('click', async () => {
  if (!state.cart.length) return;
  const pending = state.planned.filter(p => restante(p, state.cart) > 0).length;
  const message = `Concluir a compra de ${moeda(total(state.cart))}?${pending ? ` Há ${pending} produtos pendentes. Eles ficarão registrados no histórico para o próximo planejamento.` : ''}${demoMode || state.demo ? ' Esta compra é uma demonstração.' : ''}`;
  if (!(await confirmar(message))) return;
  state.history.push({ id: uid(), date: state.date, market: state.market, demo: demoMode || state.demo, items: state.cart.map(i => ({ ...i })), planned: state.planned.map(p => ({ ...p })) });
  state.cart = []; state.planned = []; state.demo = demoMode;
  const saved = save(); render(); show('historico'); if (saved) notify('Compra salva. A lista original e os preços pagos foram preservados no histórico.');
});
$('#export').addEventListener('click', async () => {
  $('#export').disabled = $('#export-mobile').disabled = true;
  try {
    const snapshot = structuredClone(state), scope = demoMode;
    let catalog, catalogWarning;
    try { catalog = await catalogUI.exportData(); }
    catch (error) { catalog = null; catalogWarning = error.message; }
    if (scope !== demoMode) throw new Error('A base mudou durante a exportação. Tente novamente.');
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...snapshot, catalog, ...(catalogWarning ? { catalogWarning } : {}), exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' }));
    const a = node('a'); a.href = url; a.download = `feira-em-dia-${scope ? 'exemplos-' : ''}${hoje()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    notify(catalogWarning ? `Cópia parcial: compras exportadas, mas catálogo e fotos não puderam ser lidos. ${catalogWarning}` : 'Cópia gerada com compras, catálogo e fotos da base aberta.');
  } catch (error) { notify(`Exportação não concluída: ${error.message}`); }
  finally { $('#export').disabled = $('#export-mobile').disabled = false; }
});
$('#export-mobile').addEventListener('click', () => $('#export').click());
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
async function install() { if (installPrompt) { const prompt = installPrompt; installPrompt = null; await prompt.prompt(); } else $('#install-dialog').showModal(); }
$('#install').addEventListener('click', install); $('#install-help').addEventListener('click', install); $('#install-dialog .dialog-close').addEventListener('click', () => $('#install-dialog').close());
function connection() { $('#connection').textContent = navigator.onLine ? '● Online' : '● Sem conexão'; }
window.addEventListener('online', connection); window.addEventListener('offline', connection); connection();
$('#today').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => notify('Acesso offline indisponível neste navegador.'));
catalogUI = iniciarCatalogo({
  getScope: () => demoMode ? 'demo' : 'real', notify,
  onCatalogChanged: products => { catalogProducts = new Map(products.map(product => [product.id, product])); renderPlans(); renderCart(); },
  addToList: product => { show('carrinho'); bucket('planned'); openProduct('planned', null, product); },
  async enterDemo() {
    if (!save()) return false;
    demoMode = true; localStorage.setItem(MODE_KEY, 'demo'); state = load(DEMO_KEY); state.demo = true;
    save(); render(); return true;
  },
  async createDemoList(products) {
    if (!demoMode) return;
    if ((state.planned.length || state.cart.length) && !await confirmar('Substituir apenas a lista e o carrinho demonstrativos por uma lista de produtos com fotos? Seus dados pessoais serão preservados.')) return;
    state.planned = products.map(product => ({ ...criarPlanejado({ id: uid(), name: nomeApresentacao(product), price: (product.priceCents / 100).toFixed(2), quantity: '1', unit: product.unit }), catalogId: product.id }));
    state.cart = []; state.market = 'Mercado Jardim · fictício'; state.date = hoje(); state.demo = true;
    save(); render(); bucket('planned'); show('carrinho'); notify(`Lista fictícia criada com ${products.length} produtos ilustrados. Os preços são simulados; as fotos podem ser consultadas em Produtos.`);
  }
});
render(); if (storageFailed) notify('Não foi possível recuperar os dados locais. Os registros anteriores não serão sobrescritos.');
