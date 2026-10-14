"""Reject private machine details in published text, binary metadata, and ZIP members."""
from pathlib import Path
from urllib.parse import urlsplit
import ipaddress
import gzip
import re
import subprocess
import struct
import zlib
import zipfile

ROOT = Path(__file__).resolve().parents[1]
URL = re.compile(r'https?://[^\s<>"\'`]+')
ADDRESS = re.compile(r'(?<![\w.])(?:[0-9]{1,3}[.]){3}[0-9]{1,3}(?![\w.])')
PRIVATE_PATH = re.compile(r'(?:[/](?:home|Users|Volumes|mnt|tmp|workspace|root|var|usr|opt|etc|run|dev|proc|sys|srv)[/]|[~][/]|\[(?:workspace|home)\][/]|(?<!\w)[A-Za-z]:\\)')
EMAIL = re.compile(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}')
MACHINE_HOST = re.compile(r'(?i)\blocal' + r'host\b|\b[\w.-]+\.(?:local|lan|internal)\b')
SERVER_SETTING = re.compile(r'(?i)--(?:port|host)(?:=|\s+)\S+|\bserver\s+ports?\s*[:=]?\s*[0-9]{2,5}')
REDACTED_PORT = re.compile(r'\[(?:address|endpoint|host)[^\]]*\]:\d{2,5}|(?i:server)[^\n<>]{0,80}(?<!\d):\d{4,5}\b')
ACCOUNT = re.compile(r'(?i)sketchfab-(?:api-token|token|ps)|Authorization:\s*Token|account\s+login')
SECRET = re.compile(r'(?:sk-[A-Za-z0-9_-]{24,}|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----)')
SESSION = re.compile(r'toolu_[A-Za-z0-9]+|session_[A-Za-z0-9]+|^- (?:session|timestamp|message_id|tool_use_id|kind):', re.MULTILINE)


def violations(data):
    text = data.replace(b'\x00', b'').decode('utf-8', errors='ignore')
    found = set()
    for match in URL.finditer(text):
        try:
            url = urlsplit(match[0])
            host = url.hostname or ''
            try:
                ipaddress.ip_address(host)
                found.add('address URL')
            except ValueError:
                pass
            if host.lower().endswith(('.local', '.lan', '.internal')) or '.' not in host:
                found.add('machine URL')
            if url.port is not None:
                found.add('explicit URL port')
            if host in ('claude.ai', 'chatgpt.com') and any(part in url.path for part in ('/artifact/', '/code/session', '/share/')):
                found.add('private session URL')
        except ValueError:
            found.add('malformed endpoint')
    # Public scientific/documentation URLs contain legitimate archive paths and dataset identifiers.
    text = URL.sub('', text)
    for label, pattern in [('address', ADDRESS), ('private path', PRIVATE_PATH),
                           ('machine hostname', MACHINE_HOST), ('email', EMAIL),
                           ('server setting', SERVER_SETTING), ('account access', ACCOUNT),
                           ('residual port', REDACTED_PORT),
                           ('credential', SECRET), ('session metadata', SESSION)]:
        if label == 'email' and '@' not in text:
            continue
        if label == 'machine hostname' and not any(s in text.lower() for s in ('local' + 'host', '.local', '.lan', '.internal')):
            continue
        if pattern.search(text):
            found.add(label)
    return found


def metadata_payload(name, data):
    """Inspect metadata rather than compressed pixels or numeric geometry payloads."""
    suffix = Path(name).suffix.lower()
    if name.endswith('.bin.gz'):
        return metadata_payload(name[:-3], gzip.decompress(data))
    if suffix == '.glb' and data[:2] == bytes((31, 139)):
        data = gzip.decompress(data)
    if suffix == '.glb' and data[:4] == b'glTF':
        size, kind = struct.unpack_from('<II', data, 12)
        return data[20:20 + size] if kind == 0x4E4F534A else b''
    if suffix == '.png' and data[:8] == b'\x89PNG\r\n\x1a\n':
        payloads = []
        offset = 8
        while offset + 12 <= len(data):
            size = struct.unpack_from('>I', data, offset)[0]
            kind = data[offset + 4:offset + 8]
            payload = data[offset + 8:offset + 8 + size]
            if kind in (b'tEXt', b'eXIf'):
                payloads.append(payload)
            elif kind == b'iTXt':
                keyword, rest = payload.split(b'\0', 1)
                language, translated, content = rest[2:].split(b'\0', 2)
                text = zlib.decompress(content) if rest[0] else content
                payloads.append(b'\n'.join((keyword, language, translated, text)))
            elif kind == b'zTXt':
                parts = payload.split(b'\0', 1)
                if len(parts) == 2:
                    payloads.append(zlib.decompress(parts[1][1:]))
            offset += size + 12
        return b'\n'.join(payloads)
    if suffix in ('.jpg', '.jpeg') and data[:2] == b'\xff\xd8':
        payloads = []
        offset = 2
        while offset + 4 <= len(data) and data[offset] == 0xff:
            marker = data[offset + 1]
            if marker in (0xda, 0xd9):
                break
            if marker == 0xff:
                offset += 1
                continue
            size = struct.unpack_from('>H', data, offset + 2)[0]
            if size < 2:
                break
            if 0xe0 <= marker <= 0xef or marker == 0xfe:
                payloads.append(data[offset + 4:offset + 2 + size])
            offset += size + 2
        return b'\n'.join(payloads)
    if suffix == '.webp' and data[:4] == b'RIFF':
        payloads = []
        offset = 12
        while offset + 8 <= len(data):
            kind, size = struct.unpack_from('<4sI', data, offset)
            if kind in (b'EXIF', b'XMP '):
                payloads.append(data[offset + 8:offset + 8 + size])
            offset += 8 + size + (size % 2)
        return b'\n'.join(payloads)
    if suffix == '.bin':
        # Terrain binaries are numeric arrays. Still reject recognizable private strings.
        runs = re.findall(rb'(?:/(?:home|Users|Volumes|mnt|tmp|workspace|root|var|usr|opt|etc|run|dev|proc|sys|srv)/|https?://)[\x20-\x7e]{8,}', data)
        return b'\n'.join(runs)
    return data


def audit():
    paths = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
    errors = []
    for name in filter(None, paths):
        path = ROOT / name
        if not path.is_file():
            continue
        if path.suffix == '.zip':
            with zipfile.ZipFile(path) as archive:
                for member in archive.infolist():
                    if member.is_dir():
                        continue
                    hits = violations(metadata_payload(member.filename, archive.read(member)))
                    if hits:
                        errors.append(f'{name} / {member.filename}: {", ".join(sorted(hits))}')
        else:
            hits = violations(metadata_payload(name, path.read_bytes()))
            if hits:
                errors.append(f'{name}: {", ".join(sorted(hits))}')
    if errors:
        raise SystemExit('Privacy audit failed:\n' + '\n'.join(errors))
    print('PASS: tracked files, embedded binary metadata, and ZIP members contain no detected private machine/account details')


if __name__ == '__main__':
    audit()
