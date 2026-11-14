import test from 'node:test';
import assert from 'node:assert/strict';
import { criarItem, criarPlanejado, subtotal, total, exemplos, comprado, restante, colocarPlanejado, editarCarrinho, planejarCompra, migrarEstado } from '../core.js';
const item = (price, quantity, unit = 'un') => criarItem({ id: 'teste', name: 'Produto', price, quantity, unit });
test('soma compra em centavos sem erro de ponto flutuante', () => { assert.equal(total([item('24,90', '2'), item('5,20', '3')]), 6540); assert.equal(total([item('0,10', '3')]), 30); });
test('calcula peso e arredonda subtotal para centavos', () => { assert.equal(subtotal(item('12,00', '0,750', 'kg')), 900); assert.equal(subtotal(item('6,99', '0,125', 'kg')), 87); });
test('rejeita preço ambíguo, negativo e quantidade inválida', () => { for (const price of ['1.234,56', '-2', 'abc', '0', '1,999']) assert.throws(() => item(price, '1')); for (const q of ['0', '-1', '1,2345']) assert.throws(() => item('1', q)); });
test('massa demonstrativa tem total conhecido', () => assert.equal(total(exemplos()), 7575));

const feijao = () => criarPlanejado({ id: 'feijao', name: 'Feijão', price: '', quantity: '2', unit: 'kg' });
const lista = () => ({ version: 2, planned: [feijao()], cart: [], history: [] });
test('planejar sem preço não soma o carrinho nem inventa preço zero', () => {
  const state = lista(); assert.equal(state.planned[0].priceCents, null); assert.equal(total(state.cart), 0); assert.equal(restante(state.planned[0], state.cart), 2);
});
test('compra parcial desconta apenas a quantidade pega e usa o preço atual', () => {
  const state = colocarPlanejado(lista(), { planId: 'feijao', quantity: '0,750', price: '12', id: 'a' });
  assert.equal(comprado(state.planned[0], state.cart), 0.75); assert.equal(restante(state.planned[0], state.cart), 1.25); assert.equal(total(state.cart), 900);
});
test('quantidades fracionárias e dois preços mantêm saldos e custo corretos', () => {
  let state = colocarPlanejado(lista(), { planId: 'feijao', quantity: '0,750', price: '12', id: 'a' });
  state = colocarPlanejado(state, { planId: 'feijao', quantity: '1,250', price: '10', id: 'b' });
  assert.equal(restante(state.planned[0], state.cart), 0); assert.equal(total(state.cart), 2150);
  assert.throws(() => colocarPlanejado(state, { planId: 'feijao', quantity: '0,001', price: '10', id: 'c' }));
});
test('excluir do carrinho devolve a quantidade à lista e dispensa não altera gasto', () => {
  const state = colocarPlanejado(lista(), { planId: 'feijao', quantity: '0,5', price: '10', id: 'a' });
  state.cart = []; assert.equal(restante(state.planned[0], state.cart), 2);
  state.planned[0].skipped = true; assert.equal(restante(state.planned[0], state.cart), 0); assert.equal(total(state.cart), 0);
});
test('edição vinculada preserva vínculo e rejeita excesso ou troca de unidade', () => {
  const state = colocarPlanejado(lista(), { planId: 'feijao', quantity: '1', price: '10', id: 'a' });
  const edited = editarCarrinho(state, criarItem({ id: 'a', name: 'Feijão', price: '11', quantity: '1,5', unit: 'kg' }));
  assert.equal(edited.cart[0].planId, 'feijao'); assert.equal(restante(edited.planned[0], edited.cart), 0.5); assert.equal(total(edited.cart), 1650);
  assert.throws(() => editarCarrinho(state, criarItem({ id: 'a', name: 'Feijão', price: '11', quantity: '3', unit: 'kg' })));
  assert.throws(() => editarCarrinho(state, criarItem({ id: 'a', name: 'Feijão', price: '11', quantity: '1', unit: 'un' })));
});
test('reutilização restaura planejamento integral, reativa dispensados e usa último preço pago', () => {
  const state = colocarPlanejado(lista(), { planId: 'feijao', quantity: '1', price: '12', id: 'a' });
  const omitted = criarPlanejado({ id: 'cafe', name: 'Café', price: '8', quantity: '2', unit: 'un' }); omitted.skipped = true;
  const extra = criarItem({ id: 'extra', name: 'Leite', price: '5', quantity: '3', unit: 'un' });
  const purchase = { planned: [...state.planned, omitted], items: [...state.cart, extra] }, before = JSON.stringify(purchase);
  let seq = 0; const result = planejarCompra(purchase, () => `nova-${seq++}`);
  assert.equal(result.length, 3); assert.equal(result[0].quantity, 2); assert.equal(result[0].priceCents, 1200); assert.equal(result[1].skipped, false);
  assert.equal(restante(result[0], []), 2); assert.equal(JSON.stringify(purchase), before);
});
test('migração mantém compras antigas e permite planejar a partir do histórico v1', () => {
  const old = { version: 1, cart: [item('10', '1')], history: [{ items: [item('5', '2')] }], market: 'Mercado' }, before = JSON.stringify(old);
  const migrated = migrarEstado(old, '2026-11-12');
  assert.equal(migrated.version, 3); assert.deepEqual(migrated.cart, old.cart); assert.deepEqual(migrated.planned, []);
  assert.equal(planejarCompra(migrated.history[0], () => 'nova')[0].quantity, 2); assert.equal(JSON.stringify(old), before);
});
