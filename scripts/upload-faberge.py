"""Upload and commit a prepared import. Authentication is supplied on hidden stdin."""
import concurrent.futures, hashlib, json, sys, termios, time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

if sys.stdin.isatty():
    settings = termios.tcgetattr(sys.stdin.fileno()); settings[3] &= ~termios.ECHO
    termios.tcsetattr(sys.stdin.fileno(), termios.TCSANOW, settings)
print('Ready for import connection JSON on stdin (input is hidden).', flush=True)
config = json.loads(sys.stdin.readline())
origin = config['url'].rstrip('/')
if urlparse(origin).scheme != 'https' or not urlparse(origin).hostname.endswith('.chatgpt.site'):
    raise RuntimeError('Use the returned HTTPS Site URL.')
root = Path(config['packagePath'])
payload = json.loads((root / 'import.json').read_text())
assets = json.loads((root / 'assets.json').read_text())
headers = {'OAI-Sites-Authorization': 'Bearer ' + config['siteToken'], 'x-mise-import-key': config['importKey']}

def request(path, body=None, extra=None):
    req = Request(origin + path, data=body, headers={**headers, **(extra or {})}, method='POST' if body is not None else 'GET')
    try:
        with urlopen(req, timeout=55) as response:
            raw = response.read()
            return json.loads(raw)
    except HTTPError as error:
        try: detail = json.loads(error.read()).get('error', 'Request failed')
        except Exception: detail = 'Request failed'
        raise RuntimeError(str(error.code) + ': ' + detail) from None

status = request('/api/faberge/import')
if any(row['batch_id'] == payload['report']['batchId'] for row in status['imports']):
    print(json.dumps({'alreadyImported': True, 'revision': status['revision']}), flush=True)
    sys.exit(0)

def upload(asset):
    raw = Path(asset['path']).read_bytes()
    if hashlib.sha256(raw).hexdigest() != asset['sha256']: raise RuntimeError('Source bytes changed after packaging.')
    for attempt in range(3):
        try:
            result = request('/api/faberge/import?' + urlencode({'mode':'asset','sha256':asset['sha256']}), raw, {'Content-Type':'application/octet-stream'})
            if result.get('sha256') != asset['sha256'] or result.get('bytes') != len(raw): raise RuntimeError('Upload verification failed.')
            return
        except (RuntimeError, URLError, TimeoutError):
            if attempt == 2: raise
            time.sleep(attempt + 1)

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for count, _ in enumerate(pool.map(upload, assets), 1):
        if count % 25 == 0 or count == len(assets): print(f'Uploaded and checksum-verified {count}/{len(assets)} assets.', flush=True)

# Read the live revision immediately before commit. The server preserves existing
# kitchen records and repeats the guard in a single transaction.
status = request('/api/faberge/import')
payload['expectedRevision'] = status['revision']
result = request('/api/faberge/import', json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode(), {'Content-Type':'application/json'})
print(json.dumps(result), flush=True)
verify = request('/api/faberge/import')
workspace = verify['state']
print(json.dumps({'verified': {'revision': verify['revision'], 'ingredients': len(workspace['ingredients']), 'recipes': len(workspace['recipes']),
                             'suppliers': len(workspace['suppliers']), 'prep': len(workspace['prep']), 'batchPresent': any(row['batch_id']==payload['report']['batchId'] for row in verify['imports'])}}), flush=True)
