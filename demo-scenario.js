import { criarLote, inserirLote, movimentar, somarDias, vazioEstoque } from './household-core.js?v=8';
import { criarPlanejado } from './core.js?v=8';
export function criarCenarioCompleto(today) {
  const products=[
    ['arroz-branco','Arroz branco · pacote 5 kg',2490,'Alimentos',2],['feijao-carioca','Feijão carioca · pacote 1 kg',890,'Alimentos',3],
    ['cafe-moido','Café moído · pacote 250 g',1290,'Alimentos',4],['leite-integral','Leite integral · 1 litro',520,'Bebidas',8],
    ['detergente','Detergente · 500 ml',280,'Limpeza',3],['sabonete','Sabonete · 85 g',250,'Higiene',6],['curativo-adesivo','Curativo adesivo · 10 unidades',690,'Saúde',1]
  ];
  const history=[];
  for(let offset=5;offset>=0;offset--){const month=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7))-1-offset,5,12)).toISOString().slice(0,7);
    for(const day of [5,20]){const date=`${month}-${String(day).padStart(2,'0')}`;if(date>today)continue;
      const items=products.filter((p,index)=>day===5||index===1||index===3).map((p,index)=>({id:`demo-item-${month}-${day}-${index}`,name:p[1],catalogId:`exemplo-${p[0]}`,priceCents:Math.round(p[2]*(1-offset*0.025)),quantity:day===5?p[4]:1,unit:'un',category:p[3]}));
      history.push({id:`demo-purchase-${month}-${day}`,date,market:day===5?'Mercado Jardim · fictício':'Supermercado Aurora · fictício',demo:true,items,planned:[]});
    }
  }
  let inventory=vazioEstoque();
  const lots=[
    ['rice','Arroz branco','arroz-branco','Alimentos',5,'kg',15,60,[600,600,600,600,600]],
    ['beans','Feijão carioca','feijao-carioca','Alimentos',3,'kg',15,30,[500,500,500,500,500]],
    ['coffee','Café moído','cafe-moido','Alimentos',1000,'g',30,90,[160,160,160,160,160]],
    ['milk','Leite integral','leite-integral','Bebidas',6,'L',7,2,[1000,1000,1000,1000,1000]],
    ['soap','Sabonete','sabonete','Higiene',6,'un',30,180,[1,1,1,1,1]],
    ['banana','Banana prata','banana-prata','Hortifruti',2,'kg',10,1,[100,100,100,100,100]],
    ['onion','Cebola','cebola','Hortifruti',500,'g',12,-1,[]],
    ['health','Curativo adesivo','curativo-adesivo','Saúde',10,'un',20,180,[1,1]]
  ];
  for(const [id,name,slug,category,quantity,unit,age,expiry,uses]of lots){const lot=criarLote({id:`demo-lot-${id}`,name,catalogId:`exemplo-${slug}`,category,quantity,unit,date:somarDias(today,-age),expiry:somarDias(today,expiry),location:category==='Higiene'?'Banheiro':category==='Saúde'?'Farmácia':slug==='leite-integral'?'Geladeira':'Despensa'});inventory=inserirLote(inventory,lot);
    uses.forEach((amount,index)=>{const daysAgo=Math.max(1,Math.round((uses.length-index)*age/(uses.length+1)));inventory=movimentar(inventory,{id:`demo-consume-${id}-${index}`,lotId:lot.id,kind:'consume',quantity:amount,unit:lot.unit,date:somarDias(today,-daysAgo)},today);});
  }
  const planned=products.filter((p,index)=>[0,1,3,5].includes(index)).map((p,index)=>({...criarPlanejado({id:`demo-plan-${index}`,name:p[1],price:(p[2]/100).toFixed(2),quantity:p[4],unit:'un'}),catalogId:`exemplo-${p[0]}`}));
  return {version:3,cart:[],planned,history,inventory,market:'Mercado Jardim · fictício',date:today,demo:true,demoDate:today,budgets:{[today.slice(0,7)]:50000},executedCommands:[]};
}
