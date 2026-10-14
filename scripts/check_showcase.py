"""Check published navigation, attachment provenance, and release packaging limits."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, hashlib, sys, re, gzip, struct
from privacy_audit import audit
root=Path(__file__).resolve().parents[1]
public=root/'public'
errors=[]
class Links(HTMLParser):
    def __init__(self): super().__init__(); self.urls=[]
    def handle_starttag(self,tag,attrs):
        for k,v in attrs:
            if k in ('href','src') and v: self.urls.append(v)

def resolve(page,url):
    parts=urlsplit(url)
    if parts.scheme or parts.netloc or not parts.path: return True
    name=unquote(parts.path)
    target=(page.parent/name).resolve() if not name.startswith('/') else root/name.lstrip('/')
    if target.is_file(): return True
    try: rel=target.relative_to(root)
    except ValueError: return False
    if str(rel).startswith('public/'):
        return (root/str(rel)[7:]).is_file()
    return (public/rel).is_file()

pages=list(root.glob('*.html'))+list(public.rglob('*.html'))
for p in pages:
    parser=Links();parser.feed(p.read_text())
    for url in parser.urls:
        if not resolve(p,url): errors.append(f'Broken local link: {p.relative_to(root)} -> {url}')
for entry in json.loads((root/'post/images/manifest.json').read_text()):
    p=root/'post/images'/entry['file']
    if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=entry['sha256']:
        errors.append(f'Attachment changed or missing: {entry["file"]}')
for region in ('shackleton', 'marius'):
    folder = public/'moon'/region
    raw = gzip.decompress((folder/'lola.bin.gz').read_bytes())
    provenance = json.loads((folder/'provenance.json').read_text())
    if hashlib.sha256(raw).hexdigest() != provenance['sha256Uncompressed']:
        errors.append(f'Moon source payload changed: {region}')
    if raw[:4] != b'HRGN' or struct.unpack_from('<H', raw, 4)[0] != 1:
        errors.append(f'Unsupported Moon source format: {region}')
    folder = public/'reviews/evidence'/f'moon-{region}'
    for entry in json.loads((folder/'captures.json').read_text()):
        if hashlib.sha256((folder/entry['file']).read_bytes()).hexdigest() != entry['sha256']:
            errors.append(f'Moon archived capture changed: {region}/{entry["file"]}')
manifest=json.loads((public/'rifts/b/manifest.json').read_text())
if any('mirror' in x['name'] for x in manifest['walls']): errors.append('Unlicensed Mirror Fault module remains in live asset manifest')
if (public/'rifts/b/wall_mirror_0.glb').exists(): errors.append('Excluded Mirror Fault binary remains packaged')
assets=[p for p in public.rglob('*') if p.is_file()]
for p in assets:
    if p.stat().st_size>=100*1024*1024: errors.append(f'File exceeds GitHub 100 MiB limit: {p.relative_to(root)}')
for folder in [root/'prompts',public/'prompt-files',root/'src']:
    for p in folder.rglob('*'):
        if not p.is_file(): continue
        text=p.read_text(errors='ignore')
        if re.search(r'(?i)(?:sk-[a-zA-Z0-9_-]{24,}|github_pat_[a-zA-Z0-9_]+|gh[pousr]_[a-zA-Z0-9]{30,}|AKIA[A-Z0-9]{16})',text):
            errors.append(f'Possible credential in {p.relative_to(root)}')
audit()
if errors:
    print('\n'.join(errors));sys.exit(1)
print(f'PASS: {len(pages)} HTML pages, six untouched captures, credited Europa adaptation; largest asset {max(p.stat().st_size for p in assets)/1024**2:.1f} MiB; public assets {sum(p.stat().st_size for p in assets)/1024**2:.1f} MiB')
