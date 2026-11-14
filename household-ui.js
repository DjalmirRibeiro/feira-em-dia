import { moeda, criarItem } from './core.js?v=8';
import { nomeApresentacao } from './catalog-core.js?v=8';
import { criarLote, saldoLote, inserirLote, movimentar, desfazerMovimento, preverEstoque, sugerirReposicao, compararCompras, exibirMedida, medida, somarDias, dataValida } from './household-core.js?v=8';

export function iniciarCasa(host) {
  const $ = id => document.getElementById(id), e = (tag,cls,text) => { const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n; };
  const btn=(text,fn,cls='text-button')=>{const b=e('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
  const q = value => (value/1000).toLocaleString('pt-BR',{maximumFractionDigits:3});
  let editLot=null, moveLot=null, imports=[];
  function applyInventory(inventory) { host.commit({...host.state(),inventory}); }
  function openEntry(lot=null) {
    editLot=lot; $('stock-entry-form').reset();$('stock-entry-error').textContent='';
    $('stock-entry-title').textContent=lot?'Editar lote':'Adicionar ao estoque';
    const select=$('stock-product');select.replaceChildren();const empty=e('option','','Sem vínculo com o catálogo');empty.value='';select.append(empty);
    for(const p of host.products().filter(p=>!p.archived)){const o=e('option','',nomeApresentacao(p));o.value=p.id;select.append(o);}
    select.value=lot?.catalogId||'';select.disabled=Boolean(lot);
    $('stock-name').value=lot?.name||'';$('stock-category').value=lot?.category||'Alimentos';
    $('stock-quantity').value=lot?q(lot.initialMilli):'1';$('stock-unit').value=lot?.unit||'un';
    $('stock-quantity').disabled=$('stock-unit').disabled=Boolean(lot);
    $('stock-date').value=lot?.acquiredOn||host.today();$('stock-date').disabled=Boolean(lot);
    $('stock-expiry').value=lot?.expiry||'';$('stock-opened').value=lot?.openedOn||'';$('stock-location').value=lot?.location||'Despensa';
    $('stock-entry-dialog').showModal();
  }
  function openMove(lot,kind) {
    moveLot=lot;$('stock-move-form').reset();$('stock-move-error').textContent='';$('stock-move-kind').value=kind;
    $('stock-move-title').textContent=`${kind==='consume'?'Registrar consumo':kind==='discard'?'Registrar descarte':'Corrigir saldo'} · ${lot.name}`;
    $('stock-move-context').textContent=`Saldo: ${exibirMedida(saldoLote(host.state().inventory,lot.id,host.today()),lot.unit)}. ${kind==='adjust'?'Informe o saldo correto, não a diferença.':'Informe a quantidade retirada.'}`;
    $('stock-move-unit').value=lot.unit;$('stock-move-date').value=host.today();$('stock-move-quantity').value=kind==='adjust'?q(saldoLote(host.state().inventory,lot.id,host.today())):'1';
    $('stock-move-dialog').showModal();
  }
  $('stock-add').addEventListener('click',()=>openEntry());$('stock-entry-close').addEventListener('click',()=>$('stock-entry-dialog').close());$('stock-move-close').addEventListener('click',()=>$('stock-move-dialog').close());
  $('stock-product').addEventListener('change',()=>{const p=host.products().find(p=>p.id===$('stock-product').value);if(p){$('stock-name').value=nomeApresentacao(p);$('stock-category').value=p.category;$('stock-unit').value=p.stockByContent?p.contentUnit:p.unit;$('stock-quantity').value=p.stockByContent&&p.contentQuantity?String(p.contentQuantity).replace('.',','):'1';}});
  $('stock-entry-form').addEventListener('submit',event=>{
    event.preventDefault();try{
      if($('stock-date').value>host.today())throw new Error('A entrada não pode ser no futuro.');
      const input={id:editLot?.id||crypto.randomUUID(),name:$('stock-name').value,catalogId:$('stock-product').value,category:$('stock-category').value,quantity:$('stock-quantity').value,unit:$('stock-unit').value,date:$('stock-date').value,expiry:$('stock-expiry').value,location:$('stock-location').value,openedOn:$('stock-opened').value};
      const lot=criarLote(input);
      if(lot.openedOn&&(!dataValida(lot.openedOn)||lot.openedOn<lot.acquiredOn||lot.openedOn>host.today()))throw new Error('Confira a data de abertura.');
      const inv=host.state().inventory;
      applyInventory(editLot?{...inv,lots:inv.lots.map(row=>row.id===editLot.id?{...row,name:lot.name,category:lot.category,expiry:lot.expiry,location:lot.location,openedOn:lot.openedOn}:row)}:inserirLote(inv,lot));
      $('stock-entry-dialog').close();host.notify('Lote salvo. Para mudar quantidades use “Corrigir saldo”.');
    }catch(error){$('stock-entry-error').textContent=error.message;}
  });
  $('stock-move-form').addEventListener('submit',event=>{event.preventDefault();try{applyInventory(movimentar(host.state().inventory,{id:crypto.randomUUID(),lotId:moveLot.id,kind:$('stock-move-kind').value,quantity:$('stock-move-quantity').value,unit:$('stock-move-unit').value,date:$('stock-move-date').value,note:$('stock-move-note').value},host.today()));$('stock-move-dialog').close();host.notify('Movimentação registrada. Ela pode ser desfeita no histórico do estoque.');}catch(error){$('stock-move-error').textContent=error.message;}});
  for(const id of ['stock-search','stock-show-empty','forecast-days'])$(id).addEventListener(id==='stock-search'?'input':'change',render);
  for(const id of ['finance-month','finance-equivalent'])$(id).addEventListener('change',render);
  $('forecast-build').addEventListener('click',()=>{
    try{const state=host.state(),forecasts=preverEstoque(state.inventory,host.today(),Number($('forecast-days').value)),plans=[];const problems=[];
      for(const f of forecasts){if(!f.neededMilli||state.planned.some(p=>(p.catalogId&&p.catalogId===f.catalogId)||p.name===f.name))continue;try{const p=sugerirReposicao(f,host.products().find(p=>p.id===f.catalogId));if(p)plans.push({...p,id:crypto.randomUUID()});}catch{problems.push(f.name);}}
      if(plans.length)host.commit({...state,planned:[...state.planned,...plans]});
      host.notify(`${plans.length} produtos adicionados à lista, sem duplicar os já planejados.${problems.length?` Confira manualmente as embalagens de: ${problems.join(', ')}.`:''}`);if(plans.length)host.show('carrinho');
    }catch(error){host.notify(error.message);}
  });
  $('budget-form').addEventListener('submit',event=>{event.preventDefault();try{const month=$('finance-month').value;const budgets={...host.state().budgets};if(!$('monthly-budget').value.trim())delete budgets[month];else budgets[month]=criarItem({id:'budget',name:'Orçamento',price:$('monthly-budget').value,quantity:1,unit:'un'}).priceCents;host.commit({...host.state(),budgets});host.notify('Orçamento salvo para o mês selecionado.');}catch(error){host.notify(error.message);}});
  $('stock-import-close').addEventListener('click',()=>$('stock-import-dialog').close());
  $('stock-import-form').addEventListener('submit',event=>{event.preventDefault();try{let inv=host.state().inventory;let count=0;for(const row of imports)if(row.checked.checked){const lot=criarLote({...row.base,quantity:row.quantity.value,unit:row.unit.value,expiry:row.expiry.value,location:row.location.value});if(lot.acquiredOn>host.today())throw new Error('Compra futura não pode entrar no estoque.');const next=inserirLote(inv,lot);if(next!==inv)count++;inv=next;}applyInventory(inv);$('stock-import-dialog').close();host.notify(`${count} lotes adicionados. Repetir a mesma entrada não duplica o estoque.`);}catch(error){$('stock-import-error').textContent=error.message;}});
  function importPurchase(purchase) {
    imports=[];$('stock-import-error').textContent='';const list=$('stock-import-list');list.replaceChildren();
    for(const item of purchase.items){const id=`purchase:${purchase.id}:${item.id}`;if(host.state().inventory.lots.some(lot=>lot.id===id))continue;
      const product=host.products().find(p=>p.id===item.catalogId);let quantity=item.quantity,unit=item.unit;
      if(item.unit==='un'&&product?.stockByContent&&product?.contentQuantity&&product?.contentUnit){quantity=Math.round(quantity*product.contentQuantity*1000)/1000;unit=product.contentUnit;}
      const base={id,name:item.name,catalogId:item.catalogId||'',category:item.category||product?.category||'Outros',date:purchase.date,purchaseId:purchase.id};
      const card=e('article','panel import-row');const checked=e('input');checked.type='checkbox';checked.checked=true;const label=e('label','check-label');label.append(checked,e('span','',item.name));card.append(label);
      const control=(name,input)=>{const label=e('label','',name);label.append(input);card.append(label);return input;};
      const amount=e('input');amount.inputMode='decimal';amount.value=String(quantity).replace('.',',');control('Quantidade que entrará no estoque',amount);
      const units=e('select');for(const value of ['un','g','kg','ml','L']){const option=e('option','',value);option.value=value;units.append(option);}units.value=unit;control('Unidade do estoque',units);
      const expiry=e('input');expiry.type='date';control('Validade (opcional)',expiry);
      const location=e('input');location.value=base.category==='Higiene'?'Banheiro':base.category==='Saúde'?'Farmácia':'Despensa';control('Local de armazenamento',location);
      imports.push({base,checked,quantity:amount,unit:units,expiry,location});list.append(card);
    }
    if(!imports.length)return host.notify('Todos os itens desta compra já foram enviados ao estoque.');
    $('stock-import-dialog').showModal();
  }
  function renderStock() {
    const state=host.state(),date=host.today(),list=$('stock-list');list.replaceChildren();const search=$('stock-search').value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
    const lots=state.inventory.lots.filter(lot=>lot.acquiredOn<=date&&($('stock-show-empty').checked||saldoLote(state.inventory,lot.id,date)>0)&&`${lot.name} ${lot.location}`.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes(search));
    const expired=state.inventory.lots.filter(lot=>lot.expiry&&lot.expiry<date&&saldoLote(state.inventory,lot.id,date)>0).length;
    $('stock-summary').textContent=`${lots.length} lotes exibidos · ${expired} vencidos com saldo. Itens vencidos ficam fora da cobertura.`;
    if(!lots.length)list.append(e('div','empty','Nenhum lote neste filtro. Adicione uma entrada ou conclua uma compra e envie seus itens ao estoque.'));
    for(const lot of lots){const card=e('article','panel stock-card');const balance=saldoLote(state.inventory,lot.id,date);card.append(e('span','eyebrow',lot.category),e('h2','',lot.name),e('strong','stock-balance',exibirMedida(balance,lot.unit)),e('p','',`${lot.location} · entrada ${lot.acquiredOn.split('-').reverse().join('/')}`));
      card.append(e('p',lot.expiry&&lot.expiry<date?'expiry-warning':'',lot.expiry?`Validade: ${lot.expiry.split('-').reverse().join('/')}${lot.expiry<date?' · VENCIDO':lot.expiry<=somarDias(date,7)?' · próximo do vencimento':''}`:'Validade não informada'));
      if(lot.openedOn)card.append(e('p','',`Aberto em ${lot.openedOn.split('-').reverse().join('/')}`));
      const actions=e('div','plan-actions');if(balance>0)actions.append(btn('Usei',()=>openMove(lot,'consume'),'button dark'),btn('Descartar',()=>openMove(lot,'discard')));actions.append(btn('Corrigir saldo',()=>openMove(lot,'adjust')),btn('Editar lote',()=>openEntry(lot)));card.append(actions);list.append(card);
    }
    const moves=$('stock-moves');moves.replaceChildren();for(const move of [...state.inventory.moves].filter(m=>m.date<=date).reverse().slice(0,30)){const lot=state.inventory.lots.find(l=>l.id===move.lotId);const row=e('div','movement-row');row.append(e('p','',`${move.date.split('-').reverse().join('/')} · ${lot?.name||'Produto'} · ${{consume:'Consumo',discard:'Descarte',adjust:'Ajuste',undo:'Reversão'}[move.kind]} · ${move.deltaMilli>=0?'+':'−'}${exibirMedida(Math.abs(move.deltaMilli),lot?.unit||'un')}${move.note?` · ${move.note}`:''}`));if(move.kind!=='undo'&&!state.inventory.moves.some(m=>m.undoOf===move.id))row.append(btn('Desfazer movimento',()=>{try{applyInventory(desfazerMovimento(host.state().inventory,move.id,crypto.randomUUID(),host.today()));host.notify('Movimentação desfeita por um registro de reversão.');}catch(error){host.notify(error.message);}}));moves.append(row);}
  }
  function renderForecasts() {
    const list=$('forecast-list');list.replaceChildren();let forecasts;try{forecasts=preverEstoque(host.state().inventory,host.today(),Number($('forecast-days').value));}catch(error){list.append(e('p','',error.message));return;}
    if(!forecasts.length)list.append(e('div','empty','Registre entradas e consumo. O exemplo completo mostra previsões sem precisar esperar semanas.'));
    for(const f of forecasts){const card=e('article','panel');card.append(e('h2','',f.name),e('strong','stock-balance',f.coverageDays==null?'Ainda sem previsão':`${f.capped?'Mais de ':''}${f.coverageDays} dias estimados`),e('p','',`Saldo utilizável: ${exibirMedida(f.balanceMilli,f.unit)} · ${f.confidence}`),e('p','',`${f.observations} registros de consumo em ${f.observedDays} dias. Descartes e ajustes não contam como consumo.`));if(f.dailyMilli)card.append(e('p','',`Média: ${exibirMedida(Math.round(f.dailyMilli),f.unit)}/dia. Reposição calculada: ${exibirMedida(f.neededMilli,f.unit)} para ${$('forecast-days').value} dias, antes de arredondar à embalagem.`));list.append(card);}
  }
  function renderFinance() {
    if(!$('finance-month').value)$('finance-month').value=host.today().slice(0,7);
    const report=compararCompras(host.state().history,$('finance-month').value,host.today(),$('finance-equivalent').checked,host.isDemo());
    $('finance-period').textContent=`${report.month}: até ${report.end.split('-').reverse().join('/')} versus ${report.previous}: até ${report.previousEnd.split('-').reverse().join('/')}${report.partial?' · mês atual parcial':''}${host.isDemo()?' · dados fictícios':''}`;
    $('finance-total').textContent=moeda(report.currentTotal);$('finance-before').textContent=moeda(report.previousTotal);$('finance-difference').textContent=`${report.difference>=0?'+':''}${moeda(report.difference)}${report.percent==null?' · sem base percentual':` (${report.percent.toFixed(1).replace('.',',')}%)`}`;
    const budget=host.state().budgets[report.month];$('monthly-budget').value=budget?(budget/100).toFixed(2).replace('.',','):'';$('budget-status').textContent=budget?`${moeda(report.currentTotal)} de ${moeda(budget)} · ${report.currentTotal>budget?'ultrapassou em '+moeda(report.currentTotal-budget):'restam '+moeda(budget-report.currentTotal)}`:'Orçamento não informado para este mês.';
    $('budget-progress').value=budget?Math.min(100,report.currentTotal/budget*100):0;
    const table=$('price-comparison');table.replaceChildren();if(!report.priceChanges.length)table.append(e('p','shopping-help','Não há apresentações iguais nos dois períodos para comparar preços.'));
    for(const row of report.priceChanges){const article=e('article','comparison-row');article.append(e('strong','',row.name),e('p','',`${moeda(Math.round(row.previous))} → ${moeda(Math.round(row.current))} / ${row.unit} · ${row.percent.toFixed(1).replace('.',',')}%`),e('small','',`Quantidade: ${row.previousQuantity.toLocaleString('pt-BR')} → ${row.quantity.toLocaleString('pt-BR')} ${row.unit}`));table.append(article);}
    for(const [id,rows] of [['finance-stores',report.stores],['finance-categories',report.categories]]){const box=$(id);box.replaceChildren();for(const [name,cents]of rows)box.append(e('p','',`${name}: ${moeda(cents)}`));if(!rows.length)box.append(e('p','','Sem compras no período.'));}
    const bars=$('finance-bars');bars.replaceChildren();const monthly=new Map();for(const p of host.state().history.filter(p=>(host.isDemo()||!p.demo)&&p.date<=host.today())){const month=p.date.slice(0,7);monthly.set(month,(monthly.get(month)||0)+p.items.reduce((sum,i)=>sum+Math.round(i.quantity*i.priceCents),0));}const maximum=Math.max(1,...monthly.values());for(const [month,cents]of [...monthly].sort().slice(-6)){const row=e('div','chart-row');row.append(e('span','',month));const meter=e('progress');meter.max=maximum;meter.value=cents;meter.setAttribute('aria-label',`${month}: ${moeda(cents)}`);row.append(meter,e('strong','',moeda(cents)));bars.append(row);}
  }
  function render(){renderStock();renderForecasts();renderFinance();$('demo-clock').hidden=!host.isDemo();$('simulation-date').textContent=host.today();}
  for(const [id,days]of [['demo-day',1],['demo-week',7],['demo-month',30]])$(id).addEventListener('click',()=>{if(host.isDemo()){host.commit({...host.state(),demoDate:somarDias(host.today(),days)});host.notify(`Somente o relógio da demonstração avançou ${days} dias.`);}});
  return {render,importPurchase};
}
