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
