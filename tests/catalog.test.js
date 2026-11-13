import test from 'node:test';
import assert from 'node:assert/strict';
import { validarProduto, filtrarProdutos, nomeApresentacao, produtosExemplo } from '../catalog-core.js';
import { criarPlanejado, colocarPlanejado, editarCarrinho, criarItem, planejarCompra } from '../core.js';

const input = { id: 'cafe', name: 'Café moído', brand: 'Marca teste', presentation: '250 g', category: 'Alimentos', unit: 'un', price: '12,90', priceDate: '2026-11-12', storeName: 'Mercado teste', barcode: 'TESTE-1234' };
test('produto mantém preço, marca, apresentação, data e loja sem criar compra', () => {
  const product = validarProduto(input);
  assert.equal(product.priceCents, 1290); assert.equal(product.storeName, 'Mercado teste'); assert.equal(nomeApresentacao(product), 'Café moído · Marca teste · 250 g');
});
test('preço desconhecido não é zero nem guarda data e loja enganosas', () => {
  const product = validarProduto({ ...input, price: '' });
  assert.equal(product.priceCents, null); assert.equal(product.priceDate, ''); assert.equal(product.storeName, '');
});
test('rejeita preço inválido, código inadequado e datas impossíveis', () => {
  for (const price of ['-1', '1,234', 'abc']) assert.throws(() => validarProduto({ ...input, price }));
  for (const barcode of ['12', '<script>', 'x'.repeat(49)]) assert.throws(() => validarProduto({ ...input, barcode }));
  for (const priceDate of ['', '2026-02-30', '2026-13-12', '12/11/2026']) assert.throws(() => validarProduto({ ...input, priceDate }));
});
test('busca ignora acentos e combina nome, marca, embalagem e código', () => {
  const product = validarProduto(input);
  for (const search of ['cafe', 'marca cafe', '250', 'teste-1234']) assert.equal(filtrarProdutos([product], { search }).length, 1);
  assert.equal(filtrarProdutos([product], { search: 'feijao' }).length, 0);
  assert.equal(filtrarProdutos([product], { category: 'Limpeza' }).length, 0);
});
test('arquivamento oculta produto sem excluí-lo da busca de arquivados', () => {
  const product = { ...validarProduto(input), archived: true };
  assert.equal(filtrarProdutos([product]).length, 0); assert.equal(filtrarProdutos([product], { archived: true }).length, 1);
});
test('exemplos têm sessenta produtos únicos e códigos explicitamente fictícios', () => {
  const products = produtosExemplo();
  assert.equal(products.length, 60); assert.equal(new Set(products.map(p => p.id)).size, 60);
  assert.equal(new Set(products.map(p => p.barcode)).size, 60);
  assert.ok(products.every(p => p.synthetic && p.barcode.startsWith('DEMO-') && p.storeName.includes('fictício')));
});
test('vínculo com catálogo persiste na compra, edição e próximo planejamento sem alterar cadastro', () => {
  const product = validarProduto(input), original = JSON.stringify(product);
  const plan = { ...criarPlanejado({ id: 'plano', name: nomeApresentacao(product), price: '12,90', quantity: '2', unit: product.unit }), catalogId: product.id };
  let state = colocarPlanejado({ planned: [plan], cart: [] }, { planId: plan.id, quantity: '1', price: '14', id: 'compra' });
  assert.equal(state.cart[0].catalogId, product.id);
  state = editarCarrinho(state, criarItem({ id: 'compra', name: plan.name, price: '15', quantity: '1', unit: 'un' }));
  assert.equal(state.cart[0].catalogId, product.id);
  const next = planejarCompra({ planned: [], items: state.cart }, () => 'novo');
  assert.equal(next[0].catalogId, product.id); assert.equal(JSON.stringify(product), original);
});
