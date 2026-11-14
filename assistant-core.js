import { decimal, moeda, restante, criarPlanejado, comprado } from './core.js?v=8';
import { normalizar, nomeApresentacao } from './catalog-core.js?v=8';
import { preverEstoque, compararCompras, exibirMedida, medida, saldoLote, movimentar, chaveEstoque } from './household-core.js?v=8';

const words={um:'1',uma:'1',dois:'2',duas:'2',tres:'3',quatro:'4',cinco:'5',seis:'6',sete:'7',oito:'8',nove:'9',dez:'10',meio:'0,5',meia:'0,5'};
export function analisarQuantidade(text){const normalized=normalizar(text).replace(/\b(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|meio|meia)\b/g,m=>words[m]);const found=normalized.match(/\b(\d+(?:[,.]\d{1,3})?)\s*(quilos?|quilogramas?|kg|gramas?|g|litros?|l|mililitros?|ml|unidades?|un|pacotes?)?\b/);if(!found)return{quantity:null,unit:null};const raw=found[2]||'un';return{quantity:decimal(found[1]),unit:/^q|^kg/.test(raw)?'kg':/^g/.test(raw)?'g':/^ml|^mil/.test(raw)?'ml':/^l/.test(raw)?'L':'un'};}
function termos(text){return normalizar(text).replace(/[?!.,:]/g,' ').split(/\s+/).filter(word=>word.length>1&&!['adicione','adicionar','coloque','colocar','retire','retirar','remova','remover','usei','usar','consumi','consumir','da','de','do','ao','na','no','minha','meu','lista','carrinho','estoque','por','favor','unidades','unidade','pacote','pacotes','quilo','quilos','quilogramas','gramas','grama','litros','litro','kg','ml','um','uma','dois','duas','tres','quatro','cinco','seis','sete','oito','nove','dez','meio','meia'].includes(word)&&!/^\d+$/.test(word));}
export function interpretarPedido(text,state,products,today,options={}){
  const normalized=normalizar(text),pending=state.planned.filter(p=>restante(p,state.cart)>0),forecasts=preverEstoque(state.inventory,today,30);
  if(!normalized.trim())throw new Error('Digite ou dite um pedido.');
  if(/cadastre esse|fotograf|capture|camera|esse produto/.test(normalized))return{kind:'capture',answer:'Abra a câmera, recorte e revise os dados. Depois de salvar, você pode adicionar à lista.'};
  if(/falta|esqueci|esquecido/.test(normalized)){const low=forecasts.filter(f=>f.coverageDays!==null&&f.coverageDays<=7&&f.category!=='Saúde');return{kind:'query',answer:`${pending.length?`Pendentes: ${pending.map(p=>`${p.name}: ${restante(p,state.cart).toLocaleString('pt-BR')} ${p.unit}`).join('; ')}.`:'Sua lista não tem pendências.'}${low.length?` Estoque com cobertura estimada de até 7 dias: ${low.map(f=>f.name).join(', ')}. Confira se precisa repor.`:''} Sugestões dependem dos seus registros; não há certeza de que algo foi esquecido.`};}
  if(/gastei|gasto|compar|mes passado|mes atual|custo/.test(normalized)){const r=compararCompras(state.history,today.slice(0,7),today,true,options.demo);return{kind:'query',answer:`Até ${today}, compras deste mês: ${moeda(r.currentTotal)}. Mesmo intervalo do mês anterior: ${moeda(r.previousTotal)}. Diferença: ${moeda(r.difference)}. Quantidades e produtos também influenciam esse valor.`};}
  if(/quanto.*carrinho|total.*compra/.test(normalized))return{kind:'query',answer:`Total no carrinho: ${moeda(state.cart.reduce((sum,i)=>sum+Math.round(i.priceCents*i.quantity),0))}.`};
  if(/dura|duracao|cobertura|dias.*tenho/.test(normalized)){const target=termos(normalized.replace(/quanto|tempo|dura|duracao|cobertura|dias|tenho|para/g,' '));const matches=forecasts.filter(f=>target.every(t=>normalizar(f.name).includes(t)));if(!matches.length)return{kind:'query',answer:'Não encontrei esse produto no estoque. Informe o nome ou registre uma entrada.'};return{kind:'query',answer:matches.map(f=>f.coverageDays==null?`${f.name}: histórico insuficiente (${f.observations} consumos em ${f.observedDays} dias).`:`${f.name}: ${f.coverageDays} dias estimados, com ${exibirMedida(f.balanceMilli,f.unit)} utilizáveis. ${f.confidence}; a validade foi considerada.`).join(' ')};}
  const kind=/\b(usei|consumi|consumir)\b/.test(normalized)?'consume':/\b(retire|retirar|remova|remover)\b/.test(normalized)?'remove':/\b(adicione|adicionar|coloque|colocar)\b/.test(normalized)?'add':null;
  if(!kind)return{kind:'query',answer:'Posso consultar pendências, gastos e duração, ou propor: “adicione 2 unidades de sabonete à lista”, “retire 1 kg de feijão da lista” e “usei 200 g de arroz”.'};
  const amount=analisarQuantidade(text);if(!amount.quantity)throw new Error('Informe a quantidade e a unidade. Ex.: “usei 200 g de arroz”.');
  const terms=termos(text),candidates=kind==='remove'?state.planned.map(p=>({...p,targetId:p.id,label:p.name})):kind==='consume'?forecasts.map(f=>({...f,targetId:f.key,label:f.name})):products.filter(p=>!p.archived).map(p=>({...p,targetId:p.id,label:nomeApresentacao(p)}));
  const matches=candidates.filter(p=>terms.every(term=>normalizar(p.label).includes(term)));
  if(!matches.length)return{kind:'query',answer:'Não encontrei um produto compatível. Tente o nome cadastrado ou use o formulário de produto.'};
  const chosen=options.targetId?matches.find(p=>p.targetId===options.targetId):matches.length===1?matches[0]:null;
  if(!chosen)return{kind:'choice',text,choices:matches.map(p=>({id:p.targetId,label:p.label})),answer:'Encontrei mais de um produto. Escolha qual deseja alterar.'};
  if(kind==='consume'&&chosen.category==='Saúde')return{kind:'query',answer:'Registre o uso de produtos de Saúde diretamente no estoque. O assistente não interpreta doses ou tratamentos.'};
  return{kind,targetId:chosen.targetId,quantity:amount.quantity,unit:amount.unit,answer:`${kind==='consume'?'Registrar consumo de':kind==='remove'?'Retirar da lista':'Adicionar à lista'} ${amount.quantity.toLocaleString('pt-BR')} ${amount.unit} de ${chosen.label}.`,commandId:options.commandId};
}
export function executarPedido(state,command,products,today,id){
  if(state.executedCommands.includes(id))return state;
  if(!['add','remove','consume'].includes(command.kind))throw new Error('Comando não permitido.');
  const amount=medida(command.quantity,command.unit);let result={...state};
  if(command.kind==='add'){
    const p=products.find(p=>p.id===command.targetId&&!p.archived);if(!p)throw new Error('Produto não encontrado.');
    const billing=medida(1,p.unit);let quantity;
    if(billing.unit===amount.unit)quantity=amount.milli/billing.milli;
    else if(p.unit==='un'&&p.contentQuantity&&p.contentUnit){const content=medida(p.contentQuantity,p.contentUnit);if(content.unit!==amount.unit)throw new Error('Unidades incompatíveis.');quantity=amount.milli/content.milli;if(!Number.isInteger(quantity))throw new Error('Essa quantidade não corresponde a embalagens inteiras. Informe a quantidade de pacotes.');}
    else throw new Error('Informe a quantidade na unidade de cobrança do produto.');
    const item={...criarPlanejado({id:`command:${id}`,name:nomeApresentacao(p),quantity,unit:p.unit,price:p.priceCents==null?'':(p.priceCents/100).toFixed(2)}),catalogId:p.id};result.planned=[...state.planned,item];
  }else if(command.kind==='remove'){
    const p=state.planned.find(p=>p.id===command.targetId);if(!p)throw new Error('Item não encontrado na lista.');const billing=medida(1,p.unit);let quantity;
    if(billing.unit===amount.unit)quantity=amount.milli/billing.milli;
    else{const product=products.find(row=>row.id===p.catalogId);if(p.unit!=='un'||!product?.contentQuantity||!product.contentUnit)throw new Error('Unidade incompatível com a lista.');const content=medida(product.contentQuantity,product.contentUnit);if(content.unit!==amount.unit)throw new Error('Unidade incompatível com o conteúdo da embalagem.');quantity=amount.milli/content.milli;if(!Number.isInteger(quantity))throw new Error('Essa retirada não corresponde a embalagens inteiras. Informe a quantidade de pacotes.');}
    if(quantity>restante(p,state.cart)+0.00001)throw new Error('A retirada excede o que falta ou atingiria itens já no carrinho.');const next=Math.round((p.quantity-quantity)*1000)/1000;
    result.planned=next===0?state.planned.filter(row=>row.id!==p.id):state.planned.map(row=>row.id===p.id?{...row,quantity:next}:row);
  }else{
    const lots=state.inventory.lots.filter(l=>chaveEstoque(l)===command.targetId&&l.acquiredOn<=today&&(!l.expiry||l.expiry>=today)).sort((a,b)=>(a.expiry||'9999').localeCompare(b.expiry||'9999'));
    if(!lots.length||lots[0].category==='Saúde'||lots[0].unit!==amount.unit)throw new Error('Produto ou unidade não disponível para consumo pelo assistente.');
    if(lots.reduce((sum,lot)=>sum+saldoLote(state.inventory,lot.id,today),0)<amount.milli)throw new Error('A quantidade excede o saldo utilizável.');
    let inv=state.inventory,left=amount.milli;for(const lot of lots){const take=Math.min(left,saldoLote(inv,lot.id,today));if(take>0)inv=movimentar(inv,{id:`${id}:${lot.id}`,lotId:lot.id,kind:'consume',quantity:take/1000,unit:lot.unit,date:today,note:'Comando confirmado no assistente'},today);left-=take;if(!left)break;}result.inventory=inv;
  }
  return{...result,executedCommands:[...state.executedCommands,id].slice(-500)};
}
