import { migrarEstado, comprado } from './core.js?v=8';
import { validarSaldos, dataValida } from './household-core.js?v=8';
import { validarProduto } from './catalog-core.js?v=8';

const list=(value,limit,name)=>{if(!Array.isArray(value)||value.length>limit)throw new Error(`${name}: lista inválida ou muito grande.`);return value;};
const id=value=>{if(typeof value!=='string'||!value||value.length>180)throw new Error('Identificador inválido no backup.');};
function items(value,planned=false){return list(value,10000,'Produtos').map(item=>{id(item.id);if(typeof item.name!=='string'||!item.name.trim()||item.name.length>160||!['un','kg','L'].includes(item.unit)||!Number.isFinite(item.quantity)||item.quantity<=0||item.quantity>10000||Math.abs(item.quantity*1000-Math.round(item.quantity*1000))>0.00001||!(planned&&item.priceCents===null)&&(!Number.isSafeInteger(item.priceCents)||item.priceCents<=0||item.priceCents>10000000))throw new Error('Produto inválido no backup.');return {...item};});}
function unique(rows){const ids=new Set();for(const row of rows){id(row.id);if(ids.has(row.id))throw new Error('Identificadores duplicados no backup.');ids.add(row.id);}return rows;}
export function validarEstadoBackup(input,today){
  const state=migrarEstado(input,today);state.cart=unique(items(state.cart));state.planned=unique(items(state.planned,true));
  for(const item of state.cart)if(item.planId&&!state.planned.some(p=>p.id===item.planId))throw new Error('Item do carrinho sem lista vinculada.');
  for(const plan of state.planned)if(comprado(plan,state.cart)>plan.quantity+0.00001)throw new Error('O carrinho excede a quantidade planejada.');
  state.history=unique(list(state.history,10000,'Compras').map(p=>{id(p.id);if(!dataValida(p.date)||typeof p.market!=='string'||p.market.length>200)throw new Error('Compra inválida no backup.');return {...p,items:unique(items(p.items)),planned:unique(items(p.planned||[],true))};}));
  state.inventory={lots:unique(list(state.inventory.lots,20000,'Lotes')),moves:unique(list(state.inventory.moves,100000,'Movimentações'))};
  for(const lot of state.inventory.lots)if(typeof lot.name!=='string'||lot.name.length>160||!lot.name.trim()||typeof lot.location!=='string'||lot.location.length>100||lot.initialMilli>1e12||lot.openedOn&&(!dataValida(lot.openedOn)||lot.openedOn<lot.acquiredOn))throw new Error('Cadastro de lote inválido.');
  validarSaldos(state.inventory);
  for(const [month,cents]of Object.entries(state.budgets))if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Number.isSafeInteger(cents)||cents<=0||cents>10000000)throw new Error('Orçamento inválido no backup.');
  if(!dataValida(state.date)||state.demoDate&&!dataValida(state.demoDate))throw new Error('Data do backup inválida.');
  state.executedCommands=list(state.executedCommands,500,'Comandos').filter(command=>typeof command==='string'&&command.length<=180);
  return state;
}
const merge=(current,incoming)=>[...current,...incoming.filter(row=>!current.some(old=>old.id===row.id))];
export function mesclarEstado(current,incoming,today){
  const result={...current,cart:merge(current.cart,incoming.cart),planned:merge(current.planned,incoming.planned),history:merge(current.history,incoming.history),inventory:{lots:merge(current.inventory.lots,incoming.inventory.lots),moves:merge(current.inventory.moves,incoming.inventory.moves)},budgets:{...incoming.budgets,...current.budgets}};
  if(!current.cart.length&&!current.planned.length){result.market=incoming.market;result.date=incoming.date;}
  return validarEstadoBackup(result,today);
}
export function validarCatalogoBackup(rows){
  return unique(list(rows||[],5000,'Catálogo').map(row=>{
    id(row.id);const product=validarProduto({...row,price:row.priceCents==null?'':(row.priceCents/100).toFixed(2)});
    const photo=value=>{if(value==null)return null;if(typeof value!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)||value.length>2800000)throw new Error('Foto inválida ou muito grande no backup.');return value;};
    let imageSource;if(row.imageSource){const source=row.imageSource;if(typeof source.pageUrl!=='string'||!source.pageUrl.startsWith('https://commons.wikimedia.org/wiki/')||typeof source.author!=='string'||source.author.length>1000||typeof source.license!=='string'||source.license.length>100)throw new Error('Crédito de imagem inválido.');imageSource={pageUrl:source.pageUrl,author:source.author,license:source.license,licenseUrl:typeof source.licenseUrl==='string'&&/^https?:\/\/(creativecommons\.org|commons\.wikimedia\.org)\//.test(source.licenseUrl)?source.licenseUrl:'https://commons.wikimedia.org/wiki/Commons:Licensing',changes:String(source.changes||'').slice(0,300)};}
    return {...product,synthetic:Boolean(row.synthetic),photo:photo(row.photo),labelPhoto:photo(row.labelPhoto),...(imageSource?{imageSource}:{})};
  }));
}
export function prepararBackup(state,catalog,includeHealth){
  const snapshot=structuredClone(state);if(includeHealth)return{...snapshot,catalog,healthExcluded:false};
  const healthIds=new Set((catalog||[]).filter(p=>p.category==='Saúde').map(p=>p.id));const safe=item=>item.category!=='Saúde'&&!healthIds.has(item.catalogId);
  snapshot.cart=snapshot.cart.filter(safe);snapshot.planned=snapshot.planned.filter(safe);
  // Se uma linha planejada de Saúde foi omitida, uma compra não pode manter vínculo com ela.
  snapshot.cart=snapshot.cart.map(item=>item.planId&&!snapshot.planned.some(p=>p.id===item.planId)?{...item,planId:undefined}:item);
  snapshot.history=snapshot.history.map(p=>({...p,items:p.items.filter(safe),planned:(p.planned||[]).filter(safe)}));
  snapshot.inventory.lots=snapshot.inventory.lots.filter(safe);const ids=new Set(snapshot.inventory.lots.map(l=>l.id));snapshot.inventory.moves=snapshot.inventory.moves.filter(m=>ids.has(m.lotId));
  return {...snapshot,catalog:catalog?.filter(p=>p.category!=='Saúde')??null,healthExcluded:true};
}
