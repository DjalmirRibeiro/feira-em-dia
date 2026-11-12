import test from 'node:test';
import assert from 'node:assert/strict';
import { criarItem, subtotal, total, exemplos } from '../core.js';
const item = (price, quantity, unit = 'un') => criarItem({ id: 'teste', name: 'Produto', price, quantity, unit });
test('soma compra em centavos sem erro de ponto flutuante', () => { assert.equal(total([item('24,90', '2'), item('5,20', '3')]), 6540); assert.equal(total([item('0,10', '3')]), 30); });
test('calcula peso e arredonda subtotal para centavos', () => { assert.equal(subtotal(item('12,00', '0,750', 'kg')), 900); assert.equal(subtotal(item('6,99', '0,125', 'kg')), 87); });
test('rejeita preço ambíguo, negativo e quantidade inválida', () => { for (const price of ['1.234,56', '-2', 'abc', '0', '1,999']) assert.throws(() => item(price, '1')); for (const q of ['0', '-1', '1,2345']) assert.throws(() => item('1', q)); });
test('massa demonstrativa tem total conhecido', () => assert.equal(total(exemplos()), 7575));
