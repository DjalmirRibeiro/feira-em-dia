import test from 'node:test';
import assert from 'node:assert/strict';
import { extrairEtiqueta, gtinValido } from '../recognition-core.js';
import { limitarRecorte, recorteEmPixels } from '../crop-core.js';
test('recorte permanece nos limites e nunca produz área vazia', () => {
  assert.deepEqual(limitarRecorte({x:-1,y:2,width:4,height:0}), {x:0,y:0.95,width:1,height:0.05});
  const r=recorteEmPixels({x:0.1,y:0.2,width:0.8,height:0.6},1000,500); assert.deepEqual(r,{x:100,y:100,width:800,height:300});
  const edge=recorteEmPixels({x:0.95,y:0.95,width:1,height:1},37,29); assert.ok(edge.x+edge.width<=37 && edge.y+edge.height<=29 && edge.width>0 && edge.height>0);
});
test('verifica dígito de controle do código em vez de aceitar números arbitrários', () => {
  assert.equal(gtinValido('4006381333931'),true); assert.equal(gtinValido('4006381333932'),false); assert.equal(gtinValido('DEMO-001'),false);
});
test('extrai nome, embalagem, marca explícita e preço de etiqueta simples', () => {
  const parsed=extrairEtiqueta('ETIQUETA FICTÍCIA\nFEIJAO CARIOCA 1 KG\nMARCA: TESTE\nR$ 8,90\n4006381333931');
  assert.equal(parsed.name,'FEIJAO CARIOCA'); assert.equal(parsed.presentation,'1 KG'); assert.equal(parsed.brand,'TESTE');
  assert.equal(parsed.prices[0].cents,890); assert.equal(parsed.ambiguous,false); assert.equal(parsed.barcode,'4006381333931');
});
test('preços de clube e promoção exigem escolha mesmo em outra linha', () => {
  for (const text of ['CAFÉ\nNORMAL R$ 12,90\nCLUBE R$ 9,90','CAFÉ\nCLUBE\nR$ 9,90','CAFÉ\nLEVE 3\nR$ 9,90']) assert.equal(extrairEtiqueta(text).ambiguous,true);
});
test('não transforma ausência, percentagem ou peso em preço', () => {
  assert.equal(extrairEtiqueta('ARROZ 5 KG').prices.length,0); assert.equal(extrairEtiqueta('DESCONTO 10,00%').prices.length,0);
  assert.equal(extrairEtiqueta('ARROZ\n1,500 kg').prices.length,0); assert.equal(extrairEtiqueta('FEIJAO\nPREÇO R$ 12,90 / KG').unit,'kg');
});
