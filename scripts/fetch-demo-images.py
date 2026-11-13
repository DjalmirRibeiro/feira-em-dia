"""Busca referências licenciadas no Commons e registra os créditos junto às imagens."""
import concurrent.futures
import html
import io
import json
import re
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
HEADERS = {'User-Agent': 'FeiraEmDia/0.4 (https://github.com/DjalmirRibeiro/feira-em-dia)'}
OVERRIDES = {
    'banana-prata': 'File:Banana-Single.jpg',
    'tomate': 'File:Tomato je (cropped).jpg',
    'batata': 'File:Kongo potato raw.jpg',
    'alface': 'File:Lettuce iceberg variety from Salinas valley California.jpeg',
    'arroz-branco': 'File:Raw rice (white).jpg',
}
QUERIES = [
    ('banana-prata', 'intitle:BananenGelb filetype:bitmap'),
    ('maca', 'red apple fruit filetype:bitmap'),
    ('laranja', 'orange fruit whole filetype:bitmap'),
    ('mamao', 'papaya fruit filetype:bitmap'),
    ('tomate', 'tomato fruit isolated filetype:bitmap'),
    ('cebola', 'onion bulb filetype:bitmap'),
    ('batata', 'intitle:"Potato and cross section" filetype:bitmap'),
    ('cenoura', 'carrots vegetable filetype:bitmap'),
    ('alface', 'intitle:"Iceberg lettuce" filetype:bitmap'),
    ('alho', 'garlic bulb filetype:bitmap'),
    ('arroz-branco', 'intitle:"Rice grains" filetype:bitmap'),
    ('feijao-carioca', 'pinto beans food filetype:bitmap'),
]

def get(url):
    with urlopen(Request(url, headers=HEADERS), timeout=40) as response:
        return response.read()

def discover(entry):
    slug, query = entry
    params = dict(action='query', generator='search', gsrsearch=query, gsrnamespace=6,
                  gsrlimit=4, prop='imageinfo', iiprop='url|extmetadata|mime', iiurlwidth=500, format='json')
    if slug in OVERRIDES:
        params = dict(action='query', titles=OVERRIDES[slug], prop='imageinfo',
                      iiprop='url|extmetadata|mime', iiurlwidth=500, format='json')
    data = json.loads(get('https://commons.wikimedia.org/w/api.php?' + urlencode(params)))
    pages = sorted(data.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 999))
    for page in pages:
        info = page.get('imageinfo', [{}])[0]
        meta = info.get('extmetadata', {})
        license_name = meta.get('LicenseShortName', {}).get('value', '')
        if info.get('mime') not in ['image/jpeg', 'image/png'] or not re.search(r'CC0|CC BY|Public domain', license_name):
            continue
        author = html.unescape(re.sub(r'<[^>]+>', '', meta.get('Artist', {}).get('value', 'Colaboradores do Wikimedia Commons'))).strip()
        return dict(id='exemplo-' + slug, title=page['title'], imageUrl=info.get('thumburl', info['url']),
                    pageUrl=info['descriptionurl'], author=author, license=license_name,
                    licenseUrl=meta.get('LicenseUrl', {}).get('value', 'https://commons.wikimedia.org/wiki/Commons:Licensing'),
                    localPath=f'assets/demo/{slug}.jpg', downloadedAt='2026-11-13',
                    changes='Miniatura convertida para JPEG, sem alteração do assunto.')
    raise RuntimeError('Nenhuma imagem licenciada encontrada: ' + slug)

def download(record):
    image = Image.open(io.BytesIO(get(record['imageUrl']))).convert('RGB')
    image.thumbnail((600, 600))
    path = ROOT / record['localPath']; path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, quality=85)
    return record

if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        records = list(pool.map(discover, QUERIES))
    print(json.dumps([{'id': r['id'], 'title': r['title'], 'license': r['license']} for r in records], ensure_ascii=False))
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        records = list(pool.map(download, records))
    (ROOT / 'assets/demo-sources.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Doze imagens e créditos preparados.')
