export function gtinValido(code) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) return false;
  const digits = [...code].map(Number), check = digits.pop();
  const sum = digits.reverse().reduce((value, digit, index) => value + digit * (index % 2 ? 1 : 3), 0);
  return (10 - sum % 10) % 10 === check;
}
export function extrairEtiqueta(text) {
  const lines = String(text).split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const prices = [];
  for (const line of lines) for (const match of line.matchAll(/(?:^|[^\d.,])(\d{1,3}(?:\.\d{3})*|\d{1,5})\s*[,\.]\s*(\d{2})(?!\d)/g)) {
    if (/%/.test(line.slice(match.index + match[0].length, match.index + match[0].length + 3))) continue;
    const cents = Number(match[1].replace(/\./g, '')) * 100 + Number(match[2]);
    if (cents <= 0 || cents > 10000000) continue;
    const conditional = /clube|cart[aã]o|fidelidade|\bapp\b|leve\s+\d|a partir|atacado|s[oó]cio/i.test(line);
    if (!prices.some(price => price.cents === cents && price.conditional === conditional)) prices.push({ cents, conditional, label: line });
  }
  const codes = [...String(text).matchAll(/\b\d[\d ]{6,18}\d\b/g)].map(match => match[0].replace(/\s/g, '')).filter(gtinValido);
  const brandLine = lines.find(line => /^marca\s*[:\-]/i.test(line));
  const presentation = lines.map(line => line.match(/\b\d+(?:[,.]\d+)?\s*(?:kg|ml|litros?|gramas?|g|l)\b/i)?.[0]).find(Boolean) || '';
  const nameLine = lines.find(line => /[a-záéíóúãõç]{3}/i.test(line) && !/^marca\s*[:\-]/i.test(line)
    && !/etiqueta|fict[ií]ci|mercado|supermercado|promo[cç][aã]o|oferta|validade|\bR\s*\$|pre[cç]o|clube|cart[aã]o|\bCNPJ\b|\bCPF\b/i.test(line)
    && !/^\d[\d\s.,]*$/.test(line));
  return { name: (nameLine || '').replace(presentation, '').replace(/[-·]+$/, '').trim().slice(0, 120),
    brand: brandLine?.replace(/^marca\s*[:\-]\s*/i, '').slice(0, 80) || '', presentation,
    unit: /(?:\/\s*kg|por\s+kg|pre[cç]o\s+(?:do\s+)?kg)/i.test(String(text)) ? 'kg' : '',
    barcode: codes[0] || '', prices,
    // Termos de promoção em outra linha também tornam a escolha do preço explícita.
    ambiguous: prices.length !== 1 || prices.some(p => p.conditional) || /clube|cart[aã]o|fidelidade|leve\s+\d|a partir|atacado/i.test(String(text)) };
}
