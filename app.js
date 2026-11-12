import { criarItem, subtotal, total, moeda, exemplos } from './core.js';

const $ = selector => document.querySelector(selector);
const KEY = 'feira-em-dia:v1';
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const novoEstado = () => ({ version: 1, cart: [], history: [], market: '', date: hoje(), demo: false });
let state = novoEstado();
let storageFailed = false;
try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved?.version === 1 && Array.isArray(saved.cart) && Array.isArray(saved.history)) state = saved; } catch { storageFailed = true; }
let toastTimer;
function notify(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 6500); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { notify('Não foi possível salvar neste navegador. Exporte os dados antes de fechar.'); return false; } }
function show(view) { document.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== `view-${view}`; }); document.querySelectorAll('[data-view]').forEach(el => { el.classList.toggle('active', el.dataset.view === view); if (el.dataset.view === view) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
const node = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
function action(label, fn, cls = 'text-button') { const button = node('button', cls, label); button.type = 'button'; button.addEventListener('click', fn); return button; }
function resetForm() { $('#item-form').reset(); $('#edit-id').value = ''; $('#form-title').textContent = 'Adicionar produto'; $('#submit-item').textContent = 'Adicionar ao carrinho +'; $('#cancel-edit').hidden = true; }
function render() {
  const sum = total(state.cart);
  $('#home-total').textContent = $('#cart-total').textContent = moeda(sum);
  $('#nav-count').textContent = state.cart.length;
  $('#home-items').textContent = `${state.cart.length} produtos diferentes${state.demo ? ' · demonstração' : ''}`;
  $('#item-count').textContent = `${state.cart.length} PRODUTOS${state.demo ? ' · EXEMPLOS FICTÍCIOS' : ''}`;
  $('#summary-count').textContent = `${state.cart.length} produtos no carrinho`;
  $('#market').value = state.market; $('#purchase-date').value = state.date;
  $('#finish').disabled = state.cart.length === 0;
  const month = state.history.filter(p => p.date.startsWith(hoje().slice(0, 7)) && !p.demo);
  $('#month-total').textContent = moeda(month.reduce((sum, purchase) => sum + total(purchase.items), 0));
  $('#month-count').textContent = `${month.length} compras reais registradas neste mês`;
  $('#history-count').textContent = state.history.filter(p => !p.demo).length;
  const list = $('#items'); list.replaceChildren();
  if (!state.cart.length) list.append(node('div', 'empty', 'Seu carrinho está esperando o primeiro produto. Adicione acima ou experimente os exemplos.'));
  for (const item of state.cart) {
    const row = node('article', 'item-row');
    const details = node('div', 'item-details'); details.append(node('strong', '', item.name), node('small', '', `${item.quantity.toLocaleString('pt-BR')} ${item.unit} × ${moeda(item.priceCents)}`));
    const actions = node('div', 'item-actions');
    actions.append(action('Editar', () => { $('#edit-id').value = item.id; $('#product').value = item.name; $('#price').value = (item.priceCents / 100).toFixed(2).replace('.', ','); $('#quantity').value = String(item.quantity).replace('.', ','); $('#unit').value = item.unit; $('#form-title').textContent = 'Editar produto'; $('#submit-item').textContent = 'Salvar alteração'; $('#cancel-edit').hidden = false; $('#product').focus(); }), action('Excluir', () => { const index = state.cart.findIndex(i => i.id === item.id); state.cart.splice(index, 1); if ($('#edit-id').value === item.id) resetForm(); save(); render(); notify(`${item.name} removido.`); const undo = action('Desfazer', () => { state.cart.splice(Math.min(index, state.cart.length), 0, item); save(); render(); $('#toast').hidden = true; }); $('#toast').append(undo); }));
    row.append(node('span', 'product-mark', '▧'), details, node('strong', 'item-price', moeda(subtotal(item))), actions); list.append(row);
  }
  const history = $('#history-list'); history.replaceChildren();
  if (!state.history.length) history.append(node('div', 'empty', 'As compras concluídas aparecerão aqui, com data, supermercado e total.'));
  for (const purchase of [...state.history].reverse()) {
    const card = node('article', 'history-card panel'); const heading = node('div', 'history-heading');
    const info = node('div'); info.append(node('h2', '', purchase.market || 'Supermercado não informado'), node('p', '', `${new Date(`${purchase.date}T12:00:00`).toLocaleDateString('pt-BR')} · ${purchase.items.length} produtos${purchase.demo ? ' · DEMONSTRAÇÃO FICTÍCIA' : ''}`));
    heading.append(info, node('strong', '', moeda(total(purchase.items))));
    const details = node('details'); details.append(node('summary', '', 'Ver produtos'));
    for (const item of purchase.items) details.append(node('p', '', `${item.name} · ${item.quantity} ${item.unit} · ${moeda(subtotal(item))}`));
    card.append(heading, details, action('Reutilizar esta compra →', () => { if (state.cart.length && !confirm('Substituir os itens do carrinho atual por esta compra?')) return; state.cart = purchase.items.map(i => ({ ...i, id: crypto.randomUUID() })); state.market = purchase.market; state.date = hoje(); state.demo = Boolean(purchase.demo); resetForm(); save(); render(); show('carrinho'); notify('Itens copiados. Revise os preços: são os valores da compra anterior.'); })); history.append(card);
  }
}
document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => show(el.dataset.view)));
document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => show(el.dataset.go)));
$('#item-form').addEventListener('submit', event => { event.preventDefault(); try { const editId = $('#edit-id').value; const item = criarItem({ id: editId || crypto.randomUUID(), name: $('#product').value, price: $('#price').value, quantity: $('#quantity').value, unit: $('#unit').value }); const index = state.cart.findIndex(i => i.id === item.id); if (index >= 0) state.cart[index] = item; else state.cart.push(item); const saved = save(); resetForm(); render(); if (saved) notify(index >= 0 ? 'Produto atualizado.' : 'Produto adicionado ao carrinho.'); $('#product').focus(); } catch (error) { notify(error.message); } });
$('#cancel-edit').addEventListener('click', resetForm);
$('#market').addEventListener('change', event => { state.market = event.target.value.trim(); save(); });
$('#purchase-date').addEventListener('change', event => { if (event.target.value) { state.date = event.target.value; save(); } });
$('#demo').addEventListener('click', () => { if (state.cart.length && !confirm('Substituir o carrinho atual por produtos fictícios? O histórico será preservado.')) return; state.cart = exemplos(); state.market = 'Mercado Jardim · fictício'; state.date = hoje(); state.demo = true; resetForm(); save(); render(); notify('Demonstração carregada. Valores fictícios; compras de exemplo ficam fora dos indicadores reais.'); });
$('#finish').addEventListener('click', () => { if (!state.cart.length) return; if (!$('#purchase-date').value) return notify('Informe a data da compra.'); if (!confirm(`Concluir e salvar a compra de ${moeda(total(state.cart))}?${state.demo ? ' Esta compra será identificada como demonstração.' : ''}`)) return; state.history.push({ id: crypto.randomUUID(), date: state.date, market: state.market, demo: state.demo, items: state.cart.map(i => ({ ...i })) }); state.cart = []; state.demo = false; resetForm(); const saved = save(); render(); show('historico'); if (saved) notify('Compra salva neste navegador.'); });
$('#export').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })); const a = node('a'); a.href = url; a.download = `feira-em-dia-${hoje()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); });
let installPrompt;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
async function install() { if (installPrompt) { const prompt = installPrompt; installPrompt = null; await prompt.prompt(); } else $('#install-dialog').showModal(); }
$('#install').addEventListener('click', install); $('#install-help').addEventListener('click', install); $('.dialog-close').addEventListener('click', () => $('#install-dialog').close());
function connection() { $('#connection').textContent = navigator.onLine ? '● Online' : '● Sem conexão'; }
window.addEventListener('online', connection); window.addEventListener('offline', connection); connection();
$('#today').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => notify('Acesso offline indisponível neste navegador.'));
render(); if (storageFailed) notify('Não foi possível recuperar os dados locais. Verifique o armazenamento do navegador.');
