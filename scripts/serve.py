"""Servidor de desenvolvimento com MIME JavaScript consistente no Windows."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os

os.chdir(Path(__file__).resolve().parent.parent)

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript',
                      '.webmanifest': 'application/manifest+json'}

print('Feira em Dia: http://127.0.0.1:4174/', flush=True)
ThreadingHTTPServer(('127.0.0.1', 4174), Handler).serve_forever()
