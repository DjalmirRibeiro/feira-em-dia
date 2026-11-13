import { criarPlanejado } from './core.js?v=6';

export const CATEGORIAS = ['Alimentos', 'Bebidas', 'Hortifruti', 'Limpeza', 'Higiene', 'Saúde', 'Outros'];
const texto = (value, limit) => String(value ?? '').trim().slice(0, limit);
export function validarProduto(input) {
  const name = texto(input.name, 120);
  const validated = criarPlanejado({ id: input.id, name, price: input.price ?? '', quantity: '1', unit: input.unit });
  const barcode = String(input.barcode ?? '').trim();
  if (barcode && !/^[A-Za-z0-9 -]{4,48}$/.test(barcode)) throw new Error('Informe um código de 4 a 48 caracteres, com letras, números, espaços ou hífen.');
  const category = CATEGORIAS.includes(input.category) ? input.category : 'Outros';
  const priceDate = texto(input.priceDate, 10);
  if (validated.priceCents !== null && !/^\d{4}-\d{2}-\d{2}$/.test(priceDate)) throw new Error('Informe a data do preço de referência.');
  if (priceDate && (Number.isNaN(Date.parse(`${priceDate}T12:00:00Z`)) || new Date(`${priceDate}T12:00:00Z`).toISOString().slice(0, 10) !== priceDate)) throw new Error('A data do preço não é válida.');
  return { id: input.id, name, brand: texto(input.brand, 80), presentation: texto(input.presentation, 80), category, barcode,
    unit: input.unit, priceCents: validated.priceCents, priceDate: validated.priceCents === null ? '' : priceDate,
    storeName: validated.priceCents === null ? '' : texto(input.storeName, 100), archived: Boolean(input.archived) };
}
export const nomeApresentacao = product => [product.name, product.brand, product.presentation].filter(Boolean).join(' · ');
export const normalizar = value => String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
export function filtrarProdutos(products, { search = '', category = '', archived = false } = {}) {
  const terms = normalizar(search).trim().split(/\s+/).filter(Boolean);
  return products.filter(product => Boolean(product.archived) === archived && (!category || product.category === category)
    && terms.every(term => normalizar(`${nomeApresentacao(product)} ${product.barcode} ${product.category}`).includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

// Valores sintéticos para demonstração. Não são ofertas de supermercados.
export function produtosExemplo() {
  const groups = [
    ['Alimentos', ['Arroz branco|5 kg', 'Feijão carioca|1 kg', 'Feijão preto|1 kg', 'Macarrão espaguete|500 g', 'Farinha de mandioca|1 kg', 'Farinha de trigo|1 kg', 'Açúcar cristal|1 kg', 'Sal refinado|1 kg', 'Óleo de soja|900 ml', 'Azeite|500 ml', 'Café moído|250 g', 'Aveia|170 g', 'Molho de tomate|300 g', 'Milho em conserva|170 g', 'Biscoito de água e sal|350 g', 'Pão de forma|450 g', 'Ovos|12 unidades', 'Queijo muçarela|200 g', 'Manteiga|200 g', 'Iogurte natural|170 g']],
    ['Bebidas', ['Leite integral|1 litro', 'Leite sem lactose|1 litro', 'Água mineral|1,5 litro', 'Água de coco|1 litro', 'Suco de uva|1 litro', 'Chá de camomila|10 sachês']],
    ['Hortifruti', ['Banana prata|A granel', 'Maçã|A granel', 'Laranja|A granel', 'Mamão|A granel', 'Tomate|A granel', 'Cebola|A granel', 'Batata|A granel', 'Cenoura|A granel', 'Alface|1 unidade', 'Alho|A granel']],
    ['Limpeza', ['Detergente|500 ml', 'Sabão em pó|800 g', 'Amaciante|2 litros', 'Água sanitária|1 litro', 'Desinfetante|2 litros', 'Limpador multiuso|500 ml', 'Esponja|3 unidades', 'Saco de lixo|30 litros', 'Pano de limpeza|1 unidade', 'Sabão em barra|5 unidades']],
    ['Higiene', ['Papel higiênico|12 rolos', 'Sabonete|85 g', 'Creme dental|90 g', 'Escova dental|1 unidade', 'Shampoo|350 ml', 'Condicionador|350 ml', 'Desodorante|150 ml', 'Absorvente|8 unidades', 'Fio dental|50 metros', 'Lenço de papel|50 unidades']],
    ['Saúde', ['Curativo adesivo|10 unidades', 'Gaze|10 unidades', 'Algodão|50 g', 'Máscara descartável|10 unidades']]
  ];
  return groups.flatMap(([category, names]) => names.map(entry => {
    const [name, presentation] = entry.split('|');
    const id = `exemplo-${normalizar(name).replace(/[^a-z0-9]+/g, '-')}`;
    const index = groups.flatMap(group => group[1]).indexOf(entry);
    return { ...validarProduto({ id, name, brand: category === 'Hortifruti' ? '' : 'Marca exemplo', presentation, category, barcode: `DEMO-${String(index + 1).padStart(4, '0')}`,
      unit: presentation === 'A granel' ? 'kg' : 'un', price: ((350 + index * 71) / 100).toFixed(2), priceDate: '2026-11-12', storeName: 'Mercado Jardim · fictício' }), synthetic: true };
  }));
}
