// Valores em centavos; quantidades com até três casas decimais.
export function decimal(value) {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(text)) throw new Error('Informe um número válido, sem separador de milhar.');
  return Number(text);
}
export function criarItem({ id, name, price, quantity, unit }) {
  const nome = String(name).trim();
  const preco = decimal(price);
  const quantidade = decimal(quantity);
  if (!nome || nome.length > 120) throw new Error('Informe o nome do produto (até 120 caracteres).');
  if (preco <= 0 || preco > 100000 || quantidade <= 0 || quantidade > 10000) throw new Error('Informe preço e quantidade positivos dentro dos limites.');
  if (Math.abs(preco * 100 - Math.round(preco * 100)) > 0.00001) throw new Error('Use no máximo duas casas decimais para o preço.');
  if (!['un', 'kg', 'L'].includes(unit)) throw new Error('Unidade inválida.');
  return { id, name: nome, priceCents: Math.round(preco * 100), quantity: quantidade, unit };
}
export const subtotal = item => Math.round(item.priceCents * item.quantity);
export const total = items => items.reduce((sum, item) => sum + subtotal(item), 0);
export const moeda = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const exemplos = () => [
  { name: 'Arroz branco · pacote 5 kg', price: '24,90', quantity: '2', unit: 'un' },
  { name: 'Leite integral · 1 litro', price: '5,20', quantity: '3', unit: 'un' },
  { name: 'Banana prata', price: '6,90', quantity: '1,5', unit: 'kg' }
].map((item, index) => criarItem({ ...item, id: `exemplo-${index}` }));

const mil = value => Math.round(value * 1000);
export function criarPlanejado(input) {
  // Preço desconhecido não equivale a produto gratuito.
  const semPreco = String(input.price ?? '').trim() === '';
  const item = criarItem({ ...input, price: semPreco ? '1' : input.price });
  return { ...item, priceCents: semPreco ? null : item.priceCents, skipped: false };
}
export const comprado = (plan, cart) => cart.filter(item => item.planId === plan.id).reduce((sum, item) => sum + mil(item.quantity), 0) / 1000;
export const restante = (plan, cart) => plan.skipped ? 0 : Math.max(0, mil(plan.quantity) - mil(comprado(plan, cart))) / 1000;
export function colocarPlanejado(state, { planId, quantity, price, id }) {
  const plan = state.planned.find(item => item.id === planId);
  if (!plan) throw new Error('Este produto não está mais na lista.');
  const item = criarItem({ id, name: plan.name, price, quantity, unit: plan.unit });
  if (mil(item.quantity) > mil(restante(plan, state.cart))) throw new Error('A quantidade é maior que o que falta. Edite a quantidade planejada primeiro.');
  return { ...state, planned: state.planned.map(row => row.id === planId ? { ...row, priceCents: item.priceCents } : row), cart: [...state.cart, { ...item, planId, ...(plan.catalogId ? { catalogId: plan.catalogId } : {}) }] };
}
export function editarCarrinho(state, item) {
  const previous = state.cart.find(row => row.id === item.id);
  if (!previous) throw new Error('Produto não encontrado no carrinho.');
  if (previous.planId) {
    const plan = state.planned.find(row => row.id === previous.planId);
    if (!plan) throw new Error('A lista vinculada não foi encontrada.');
    if (item.unit !== plan.unit || item.name !== plan.name) throw new Error('Para trocar produto ou unidade, exclua do carrinho e adicione o novo produto.');
    const other = state.cart.filter(row => row.id !== item.id);
    if (mil(item.quantity) + mil(comprado(plan, other)) > mil(plan.quantity)) throw new Error('A quantidade excede o planejado. Edite a lista primeiro.');
  }
  return { ...state, cart: state.cart.map(row => row.id === item.id ? { ...item, ...(previous.planId ? { planId: previous.planId } : {}), ...(previous.catalogId ? { catalogId: previous.catalogId } : {}) } : row) };
}
export function planejarCompra(purchase, newId) {
  const planned = (purchase.planned || []).map(item => {
    const lastPaid = [...purchase.items].reverse().find(row => row.planId === item.id);
    return { ...item, id: newId(), skipped: false, priceCents: lastPaid?.priceCents ?? item.priceCents };
  });
  const extras = (purchase.planned?.length ? purchase.items.filter(item => !item.planId) : purchase.items);
  for (const item of extras) planned.push({ id: newId(), name: item.name, quantity: item.quantity, unit: item.unit, priceCents: item.priceCents, skipped: false, ...(item.catalogId ? { catalogId: item.catalogId } : {}) });
  return planned;
}
export function migrarEstado(saved, date) {
  if (!saved || ![1, 2, 3].includes(saved.version) || !Array.isArray(saved.cart) || !Array.isArray(saved.history)) throw new Error('Formato de dados não reconhecido.');
  return { ...saved, version: 3, planned: saved.version >= 2 && Array.isArray(saved.planned) ? saved.planned : [], date: saved.date || date,
    inventory: saved.inventory || {lots:[],moves:[]},budgets:saved.budgets||{},executedCommands:saved.executedCommands||[] };
}
