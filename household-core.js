import { decimal, total } from './core.js?v=8';
export const dataValida = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
export const somarDias = (date, days) => { if (!dataValida(date) || !Number.isInteger(days)) throw new Error('Data ou intervalo inválido.'); return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10); };
export const diasEntre = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
const unidades = { un: ['un', 1], g: ['g', 1], kg: ['g', 1000], ml: ['ml', 1], L: ['ml', 1000] };
export function medida(quantity, unit, allowZero = false) {
  const q = decimal(quantity), conversion = unidades[unit];
  if (!conversion || q < 0 || !allowZero && q === 0 || q > 1000000) throw new Error('Informe uma quantidade válida e sua unidade.');
  return { unit: conversion[0], milli: Math.round(q * conversion[1] * 1000) };
}
export function exibirMedida(milli, unit) {
  const base = milli / 1000, large = (unit === 'g' || unit === 'ml') && base >= 1000;
  return `${(large ? base / 1000 : base).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${large ? unit === 'g' ? 'kg' : 'L' : unit}`;
}
export const vazioEstoque = () => ({ lots: [], moves: [] });
export function criarLote(input) {
  const name = String(input.name || '').trim(), amount = medida(input.quantity, input.unit);
  if (!input.id || !name || name.length > 160) throw new Error('Informe o produto do estoque.');
  if (!dataValida(input.date) || input.expiry && !dataValida(input.expiry)) throw new Error('Confira as datas do lote.');
  if (input.expiry && input.expiry < input.date) throw new Error('A validade não pode ser anterior à entrada.');
  return { id: input.id, name, catalogId: input.catalogId || '', category: input.category || 'Outros', initialMilli: amount.milli, unit: amount.unit,
    acquiredOn: input.date, expiry: input.expiry || '', location: String(input.location || 'Despensa').trim().slice(0, 60), purchaseId: input.purchaseId || '', openedOn: input.openedOn || '' };
}
export function saldoLote(inventory, id, date = '9999-12-31') {
  const lot = inventory.lots.find(row => row.id === id);
  if (!lot || lot.acquiredOn > date) return 0;
  return lot.initialMilli + inventory.moves.filter(move => move.lotId === id && move.date <= date).reduce((sum, move) => sum + move.deltaMilli, 0);
}
export function inserirLote(inventory, lot) {
  if (inventory.lots.some(row => row.id === lot.id)) return inventory;
  return { ...inventory, lots: [...inventory.lots, lot] };
}
export function movimentar(inventory, input, today) {
  if (inventory.moves.some(row => row.id === input.id)) return inventory;
  const lot = inventory.lots.find(row => row.id === input.lotId);
  if (!lot) throw new Error('Lote não encontrado.');
  if (!dataValida(input.date) || input.date < lot.acquiredOn || input.date > today) throw new Error('Use uma data entre a entrada e hoje.');
  const amount = medida(input.quantity, input.unit, input.kind === 'adjust');
  if (amount.unit !== lot.unit) throw new Error('A unidade não é compatível com este lote.');
  if (!['consume', 'discard', 'adjust'].includes(input.kind)) throw new Error('Tipo de movimentação inválido.');
  const balance = saldoLote(inventory, lot.id, input.date);
  const deltaMilli = input.kind === 'adjust' ? amount.milli - balance : -amount.milli;
  if (balance + deltaMilli < 0) throw new Error('A quantidade é maior que o saldo do lote.');
  const result = { ...inventory, moves: [...inventory.moves, { id: input.id, lotId: lot.id, kind: input.kind, date: input.date, deltaMilli, note: String(input.note || '').slice(0, 160) }] };
  validarSaldos(result); return result;
}
export function desfazerMovimento(inventory, id, newId, date) {
  const move = inventory.moves.find(row => row.id === id);
  if (!move || move.kind === 'undo' || inventory.moves.some(row => row.undoOf === id)) throw new Error('Esta movimentação já foi desfeita ou não pode ser desfeita.');
  if (!dataValida(date) || date < move.date) throw new Error('Data de reversão inválida.');
  const result = { ...inventory, moves: [...inventory.moves, { id: newId, lotId: move.lotId, kind: 'undo', date, deltaMilli: -move.deltaMilli, undoOf: id, note: 'Reversão solicitada pelo usuário' }] };
  validarSaldos(result); return result;
}
export function validarSaldos(inventory) {
  const ids = new Set();
  for (const lot of inventory.lots) {
    if (ids.has(lot.id) || !Number.isSafeInteger(lot.initialMilli) || lot.initialMilli <= 0 || !['g', 'ml', 'un'].includes(lot.unit) || !dataValida(lot.acquiredOn)) throw new Error('Lote inválido ou duplicado.');
    if (lot.expiry && (!dataValida(lot.expiry) || lot.expiry < lot.acquiredOn)) throw new Error('Validade inválida.'); ids.add(lot.id);
    let balance = lot.initialMilli;
    for (const move of inventory.moves.filter(row => row.lotId === lot.id).map((row, index) => ({ ...row, index })).sort((a,b) => a.date.localeCompare(b.date) || a.index-b.index)) {
      if (!Number.isSafeInteger(move.deltaMilli) || !dataValida(move.date) || move.date < lot.acquiredOn) throw new Error('Movimentação inválida.');
      balance += move.deltaMilli; if (balance < 0) throw new Error('A alteração deixaria saldo negativo no histórico.');
    }
  }
  const moveIds = new Set();
  for (const move of inventory.moves) { if (moveIds.has(move.id) || !ids.has(move.lotId) || !['consume','discard','adjust','undo'].includes(move.kind)) throw new Error('Movimentação sem lote ou duplicada.'); moveIds.add(move.id); }
  const undone=new Set();for(const move of inventory.moves){if(['consume','discard'].includes(move.kind)&&move.deltaMilli>=0)throw new Error('Baixa de estoque inválida.');if(move.kind==='undo'){const original=inventory.moves.find(row=>row.id===move.undoOf);if(!original||original.kind==='undo'||original.lotId!==move.lotId||original.date>move.date||original.deltaMilli!==-move.deltaMilli||undone.has(original.id))throw new Error('Reversão de estoque inválida.');undone.add(original.id);}}
  return true;
}
const normal = value => value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
export const chaveEstoque = lot => `${lot.catalogId || normal(lot.name)}|${lot.unit}`;
function simularConsumo(lots, inventory, date, daily, horizon) {
  const balances = lots.map(lot => ({ ...lot, balance: saldoLote(inventory, lot.id, date) })).sort((a,b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'));
  let used = 0, days = 0;
  for (let day = 0; day < horizon; day++) {
    const current = somarDias(date, day); let need = daily;
    for (const lot of balances) { if (lot.expiry && lot.expiry < current) lot.balance = 0; const take = Math.min(lot.balance, need); lot.balance -= take; need -= take; used += take; }
    if (need > 0.001) break; days++;
  }
  return { used, days };
}
export function preverEstoque(inventory, date, horizon = 30) {
  if (!dataValida(date) || !Number.isInteger(horizon) || horizon < 1 || horizon > 365) throw new Error('Escolha de 1 a 365 dias.');
  const groups = new Map(), windowStart = somarDias(date, -60), undone = new Set(inventory.moves.filter(move => move.kind === 'undo' && move.date <= date).map(move => move.undoOf));
  for (const lot of inventory.lots.filter(lot => lot.acquiredOn <= date)) { const key = chaveEstoque(lot); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(lot); }
  return [...groups.entries()].map(([key, lots]) => {
    const ids = new Set(lots.map(lot => lot.id)), earliest = lots.map(lot => lot.acquiredOn).sort()[0], start = earliest > windowStart ? earliest : windowStart;
    const observations = inventory.moves.filter(move => ids.has(move.lotId) && move.kind === 'consume' && !undone.has(move.id) && move.date >= start && move.date <= date);
    const days = diasEntre(start, date), consumed = observations.reduce((sum, move) => sum - move.deltaMilli, 0);
    const balance = lots.filter(lot => !lot.expiry || lot.expiry >= date).reduce((sum, lot) => sum + saldoLote(inventory, lot.id, date), 0);
    const daily = days >= 7 && observations.length >= 2 && consumed > 0 ? consumed / days : null;
    const coverage = daily ? simularConsumo(lots, inventory, date, daily, 365) : null;
    const usable = daily ? simularConsumo(lots, inventory, date, daily, horizon).used : null;
    return { key, name: lots[0].name, catalogId: lots[0].catalogId, unit: lots[0].unit, category: lots[0].category, balanceMilli: balance,
      dailyMilli: daily, coverageDays: coverage?.days ?? null, capped: coverage?.days === 365, neededMilli: daily ? Math.max(0, Math.ceil(daily * horizon - usable)) : null,
      observations: observations.length, observedDays: days, confidence: !daily ? 'Histórico insuficiente' : observations.length >= 8 && days >= 28 ? 'Maior histórico' : 'Estimativa inicial' };
  });
}
export function sugerirReposicao(forecast, product) {
  if (forecast.neededMilli == null) throw new Error('Ainda não há histórico suficiente para sugerir uma quantidade.');
  if (forecast.neededMilli <= 0) return null;
  let factor, billingUnit;
  if(product?.unit==='un'&&forecast.unit==='un'){factor=1000;billingUnit='un';}
  else if (product?.unit === 'un' && product.contentQuantity && product.contentUnit) { const content = medida(product.contentQuantity, product.contentUnit); if (content.unit !== forecast.unit) throw new Error('O conteúdo da embalagem é incompatível com o estoque.'); factor = content.milli; billingUnit = 'un'; }
  else { billingUnit = product?.unit || forecast.unit; const one = medida(1, billingUnit); if (one.unit !== forecast.unit) throw new Error('Informe o conteúdo da embalagem no catálogo ou planeje a reposição manualmente.'); factor = one.milli; }
  const quantity = billingUnit === 'un' ? Math.ceil(forecast.neededMilli / factor) : Math.ceil(forecast.neededMilli / factor * 1000) / 1000;
  return { name: forecast.name, catalogId: forecast.catalogId, quantity, unit: billingUnit, priceCents: product?.priceCents ?? null, skipped: false };
}
const monthEnd = month => new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5)), 0, 12)).toISOString().slice(0,10);
export function compararCompras(history, month, today, equivalent = true, includeDemo = false) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mês inválido.');
  const previous = new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5))-2, 1, 12)).toISOString().slice(0,7);
  const end = month === today.slice(0,7) ? today : monthEnd(month), day = Number(end.slice(8));
  const previousEnd = equivalent ? `${previous}-${String(Math.min(day,Number(monthEnd(previous).slice(8)))).padStart(2,'0')}` : monthEnd(previous);
  const select = (prefix, until) => history.filter(p => (includeDemo || !p.demo) && p.date.startsWith(prefix) && p.date <= until && p.date <= today);
  const current = select(month,end), before = select(previous,previousEnd);
  const currentTotal = current.reduce((sum,p) => sum+total(p.items),0), previousTotal = before.reduce((sum,p) => sum+total(p.items),0);
  const summarize = purchases => {
    const products = new Map();
    for (const p of purchases) for (const item of p.items) {
      const key = `${item.catalogId || normal(item.name)}|${normal(item.name)}|${item.unit}`; const row = products.get(key) || { name:item.name,unit:item.unit,quantity:0,cents:0 };
      row.quantity+=item.quantity;row.cents+=Math.round(item.priceCents*item.quantity);products.set(key,row);
    }
    return products;
  };
  const a = summarize(current), b = summarize(before), priceChanges=[];
  for (const [key,row] of a) if (b.has(key)) { const prior=b.get(key), nowPrice=row.cents/row.quantity, oldPrice=prior.cents/prior.quantity; priceChanges.push({name:row.name,unit:row.unit,current:nowPrice,previous:oldPrice,percent:oldPrice?(nowPrice-oldPrice)/oldPrice*100:null,quantity:row.quantity,previousQuantity:prior.quantity}); }
  const stores = new Map(), categories = new Map();
  for (const p of current) { const name=p.market || 'Não informado';stores.set(name,(stores.get(name)||0)+total(p.items));for(const item of p.items){const category=item.category||'Outros';categories.set(category,(categories.get(category)||0)+Math.round(item.priceCents*item.quantity));} }
  return { month, previous, end, previousEnd, currentTotal, previousTotal, difference:currentTotal-previousTotal, percent:previousTotal?(currentTotal-previousTotal)/previousTotal*100:null,
    currentCount:current.length,previousCount:before.length,priceChanges,stores:[...stores],categories:[...categories],partial:month===today.slice(0,7) && end!==monthEnd(month) };
}
