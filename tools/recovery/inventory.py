#!/usr/bin/env python3
"""Read-only Git/ZIP evidence inventory. Never extracts files or executes their content."""
from __future__ import annotations

import argparse
import ast
from collections import Counter, defaultdict
from dataclasses import dataclass
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import zipfile


@dataclass(frozen=True)
class Limits:
    member_bytes: int = 32 * 1024 * 1024
    total_bytes: int = 512 * 1024 * 1024
    archive_entries: int = 20000
    archive_depth: int = 4
    compression_ratio: int = 2000


class InspectionLimit(ValueError):
    pass


def unsafe_path(name: str) -> bool:
    normalized = name.replace('\\', '/')
    return ('\x00' in name or normalized.startswith('/') or bool(re.match(r'^[A-Za-z]:', normalized))
            or '..' in normalized.split('/'))


def archive_format(data: bytes) -> str | None:
    if data.startswith((b'PK\x03\x04', b'PK\x05\x06', b'PK\x07\x08')):
        return 'ZIP'
    for magic, name in ((b'\x1f\x8b', 'gzip'), (b'BZh', 'bzip2'), (b'\xfd7zXZ\x00', 'xz'),
                        (b'7z\xbc\xaf\x27\x1c', '7z'), (b'Rar!\x1a\x07', 'RAR')):
        if data.startswith(magic):
            return name
    if len(data) > 262 and data[257:262] == b'ustar':
        return 'tar'
    return None


LANGUAGES = {'.py': 'Python', '.mjs': 'JavaScript', '.js': 'JavaScript', '.ts': 'TypeScript',
             '.tsx': 'TypeScript', '.jsx': 'JavaScript', '.go': 'Go', '.kt': 'Kotlin', '.kts': 'Kotlin',
             '.java': 'Java', '.cs': 'C#', '.sh': 'Shell', '.bash': 'Shell', '.ps1': 'PowerShell',
             '.rs': 'Rust', '.c': 'C', '.h': 'C/C++', '.cpp': 'C++', '.css': 'CSS', '.html': 'HTML'}


def describe(path: str, data: bytes, archived: bool) -> dict:
    """Content evidence and conservative proposed classification, not runtime claims."""
    name = PurePosixPath(path.split('!/')[-1]).name
    original_name = name
    if name.endswith('.txt') and Path(name[:-4]).suffix in set(LANGUAGES) | {'.json', '.toml', '.yaml', '.yml'}:
        name = name[:-4]
    suffix = Path(name).suffix.lower()
    language = LANGUAGES.get(suffix)
    text = None
    try:
        if b'\x00' not in data:
            text = data.decode('utf-8-sig')
    except UnicodeDecodeError:
        pass
    roles = []
    is_test = bool(re.search(r'(^|/)(tests?|fixtures?)(/|\.)|(^|/)(test_[^/]+|[^/]+[._]test[._][^/]+)$', path.lower()))
    if is_test:
        roles.append('test or fixture')
    config = (name in ('package.json', 'package-lock.json', 'pyproject.toml', 'go.mod', 'go.sum', '.gitignore', '.env.example')
              or suffix in ('.json', '.yaml', '.yml', '.toml', '.ini', '.lock', '.xml')
              or name.startswith(('Dockerfile', 'Makefile')))
    if config:
        roles.append('configuration or build infrastructure')
    if language:
        roles.append('valuable implementation awaiting integration' if archived else 'implementation under review')
    if suffix in ('.html', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.woff', '.woff2', '.ico'):
        roles.append('UI or other project asset')
    if suffix in ('.md', '.txt', '.rst') or name.upper().startswith(('LICENSE', 'NOTICE')):
        roles.append('architectural/product knowledge')
    if archived:
        roles.append('historical evidence')
    if not roles:
        roles.append('security-suspicious or unresolved material')
    # The feature owner is a candidate inferred from actual text as well as location.
    evidence = (path + '\n' + (text or '')[:300000]).lower()
    scores = {
        'model communication': ('ollama', 'model-gateway', 'llm', 'litellm', 'chatcompletion'),
        'agent lifecycle and tools': ('agent-adapter', 'conversation', 'openhands', 'toolcall', 'agent_server'),
        'restricted execution': ('sandbox', 'workspace', 'execd', 'cgroup', 'seccomp'),
        'project generation': ('generatemockproject', 'project-generator', 'selecttemplate'),
        'builder API': ('createhandler', '/api/generate', 'builder-api'),
        'builder UI and preview': ('builder-web', 'previewframe', 'srcdoc', 'html'),
        'training and evaluation': ('finetun', 'dataset', 'evaluation', 'benchmark'),
        'identity and authorization': ('authentication', 'authorization', 'oauth'),
    }
    ranked = sorted(((sum(evidence.count(word) for word in words), feature) for feature, words in scores.items()), reverse=True)
    owner = ranked[0][1] if ranked[0][0] else 'repository knowledge or infrastructure'
    result = {'content_type': language or ('UTF-8 text' if text is not None else 'binary'),
              'roles': roles, 'feature_candidate': owner,
              'status': 'static content inspected; execution not attempted' if archived else 'static content inspected; runtime results recorded separately',
              'proposed_action': 'retain for provenance and selective integration review' if archived else 'retain in current functional owner',
              'future_location': path,
              'required_validation': 'dependency/license review and isolated behavioral tests before integration' if archived and language else 'owner-specific tests and reference integrity'}
    if original_name != name:
        result['disguised_source'] = True
        result['source_name'] = name
    if text is not None:
        result['lines'] = len(text.splitlines())
        result['code_fences'] = len(re.findall(r'^```[^\n]*', text, re.M)) if suffix in ('.md', '.txt') else 0
        if language in ('JavaScript', 'TypeScript'):
            result['imports'] = sorted(set(re.findall(r'(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\(|\bimport\s*)[\'\"]([^\'\"]+)[\'\"]', text)))
            result['exports'] = sorted(set(re.findall(r'\bexport\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+(\w+)', text)))
        elif language == 'Python':
            try:
                tree = ast.parse(text)
                result['imports'] = sorted(set(node.module or '' for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)) |
                                           {alias.name for node in ast.walk(tree) if isinstance(node, ast.Import) for alias in node.names})
                result['exports'] = [node.name for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))]
            except (SyntaxError, ValueError, RecursionError) as error:
                result['parse_observation'] = type(error).__name__
        elif language == 'Go':
            result['imports'] = sorted(set(re.findall(r'^\s*(?:import\s+)?(?:\w+\s+)?\"([^\"\n]+)\"', text, re.M)))
            result['exports'] = sorted(set(re.findall(r'^func\s+(?:\([^)]*\)\s*)?([A-Z]\w*)', text, re.M)))
        elif language in ('Java', 'Kotlin', 'C#', 'Rust'):
            result['imports'] = sorted(set(re.findall(r'^\s*(?:import|using|use)\s+([^;\n]+)', text, re.M)))
            result['exports'] = sorted(set(re.findall(r'\b(?:class|interface|enum|struct|trait)\s+(\w+)', text)))
        if language:
            result['framework_evidence'] = sorted({framework for framework in ('fastapi', 'pydantic', 'react', 'next', 'express', 'pytest', 'playwright', 'docker', 'kubernetes', 'litellm')
                                                  if re.search(r'\b' + framework + r'\b', text, re.I)})
        if name == 'package.json':
            try:
                manifest = json.loads(text)
                result['manifest'] = {key: manifest[key] for key in ('name', 'version', 'license', 'engines', 'scripts', 'dependencies', 'devDependencies') if key in manifest}
            except (ValueError, TypeError):
                result['parse_observation'] = 'invalid JSON manifest'
        elif name == 'pyproject.toml':
            import tomllib
            try:
                manifest = tomllib.loads(text).get('project', {})
                result['manifest'] = {key: manifest[key] for key in ('name', 'version', 'license', 'requires-python', 'dependencies') if key in manifest}
            except tomllib.TOMLDecodeError:
                result['parse_observation'] = 'invalid TOML manifest'
        if name.upper().startswith(('LICENSE', 'NOTICE')):
            result['license_markers'] = [marker for marker in ('MIT License', 'Apache License', 'Version 2.0', 'GNU GENERAL PUBLIC LICENSE', 'Copyright') if marker in text]
    return result


class Inspector:
    def __init__(self, limits: Limits = Limits()):
        self.limits = limits
        self.bytes_read = 0
        self.items: list[dict] = []
        self.archives: list[dict] = []
        self.issues: list[dict] = []

    def item(self, path: str, data: bytes, **fields) -> dict:
        record = {'path': path, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), **fields,
                  **describe(path, data, bool(fields.get('container')))}
        self.items.append(record)
        return record

    def container(self, path: str, data: bytes, depth: int = 0) -> None:
        kind = archive_format(data)
        if kind == 'ZIP':
            self.archive(path, data, depth)
        elif kind is not None:
            self.issues.append({'path': path, 'reason': kind + ' container hashed but nested members uninspected; unsupported format'})

    def archive(self, path: str, data: bytes, depth: int = 0) -> None:
        if depth >= self.limits.archive_depth:
            self.issues.append({'path': path, 'reason': 'archive nesting depth limit; member retained without recursion'})
            return
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                infos = archive.infolist()
                if len(infos) > self.limits.archive_entries:
                    raise InspectionLimit('archive entry count exceeds limit')
                summary = {'path': path, 'entries': len(infos), 'files': sum(not i.is_dir() for i in infos),
                           'declared_uncompressed_bytes': sum(i.file_size for i in infos), 'depth': depth}
                self.archives.append(summary)
                names = Counter(i.filename for i in infos)
                for index, info in enumerate(infos):
                    member_path = path + '!/' + info.filename
                    fields = {'container': path, 'member_index': index, 'declared_bytes': info.file_size,
                              'compressed_bytes': info.compress_size, 'crc32': f'{info.CRC:08x}',
                              'unsafe_path': unsafe_path(info.filename),
                              'symlink': stat.S_ISLNK(info.external_attr >> 16),
                              'duplicate_member_name': names[info.filename] > 1}
                    if info.is_dir():
                        self.items.append({'path': member_path, **fields, 'roles': ['directory'], 'status': 'metadata inspected'})
                        if fields['unsafe_path'] or fields['symlink'] or fields['duplicate_member_name']:
                            self.issues.append({'path': member_path, 'reason': 'unsafe directory metadata; never extracted'})
                        continue
                    reason = None
                    if info.flag_bits & 1:
                        reason = 'encrypted member cannot be inspected'
                    elif info.file_size > self.limits.member_bytes:
                        reason = 'member decompression size exceeds limit'
                    elif info.file_size > max(1, info.compress_size) * self.limits.compression_ratio:
                        reason = 'member compression ratio exceeds limit'
                    elif self.bytes_read + info.file_size > self.limits.total_bytes:
                        reason = 'aggregate decompression budget exceeded'
                    if reason:
                        self.items.append({'path': member_path, **fields, 'roles': ['security-suspicious or unresolved material'], 'status': reason})
                        self.issues.append({'path': member_path, 'reason': reason})
                        continue
                    try:
                        # Bound actual reads as well as trusting declared sizes; ZipFile also checks CRC.
                        with archive.open(info) as stream:
                            member = stream.read(self.limits.member_bytes + 1)
                        if len(member) > self.limits.member_bytes:
                            raise InspectionLimit('actual decompression exceeds member limit')
                        self.bytes_read += len(member)
                        record = self.item(member_path, member, **fields)
                        if fields['unsafe_path'] or fields['symlink'] or fields['duplicate_member_name']:
                            record['roles'].append('security-suspicious or unresolved material')
                            self.issues.append({'path': member_path, 'reason': 'unsafe path, symlink, or duplicate name; never extracted'})
                        self.container(member_path, member, depth + 1)
                    except (zipfile.BadZipFile, RuntimeError, NotImplementedError, InspectionLimit, OSError) as error:
                        self.items.append({'path': member_path, **fields, 'roles': ['security-suspicious or unresolved material'], 'status': type(error).__name__})
                        self.issues.append({'path': member_path, 'reason': type(error).__name__})
        except (zipfile.BadZipFile, InspectionLimit, OSError) as error:
            self.issues.append({'path': path, 'reason': str(error)})


def git(root: Path, *args: str) -> bytes:
    return subprocess.run(['git', '-C', str(root), *args], check=True, stdout=subprocess.PIPE).stdout


def rename_evidence(root: Path, ref: str) -> list[dict]:
    parts = git(root, 'log', '--format=', '--name-status', '--find-renames=90%', '-z', ref).decode().split('\x00')
    records = []
    index = 0
    while index < len(parts):
        status = parts[index].strip()
        index += 1
        if status.startswith(('R', 'C')) and index + 1 < len(parts):
            records.append({'old_path': parts[index], 'new_path': parts[index + 1], 'similarity': status, 'evidence': 'Git rename similarity, not authorship proof'})
            index += 2
        elif status and index < len(parts):
            index += 1
    return records


def generate(root: Path, ref: str) -> tuple[dict, dict]:
    commit = git(root, 'rev-parse', '--verify', ref + '^{commit}').decode().strip()
    entries = git(root, 'ls-tree', '-rz', '--full-tree', '--long', commit).split(b'\x00')
    inspector = Inspector()
    tracked = []
    for entry in entries:
        if not entry:
            continue
        metadata, raw_path = entry.split(b'\t', 1)
        mode, kind, oid, size = metadata.decode().split()
        path = raw_path.decode('utf-8')
        tracked.append(path)
        if kind != 'blob':
            inspector.issues.append({'path': path, 'reason': 'non-blob Git entry; metadata only'})
            continue
        data = git(root, 'cat-file', 'blob', oid)
        record = inspector.item(path, data, git_blob=oid, git_mode=mode)
        if mode == '120000':
            record['roles'].append('security-suspicious or unresolved material')
            record['status'] = 'Git symlink target read as data; not followed'
        inspector.container(path, data)
    by_hash = defaultdict(list)
    for item in inspector.items:
        if item.get('sha256'):
            by_hash[item['sha256']].append(item['path'])
    duplicates = [{'sha256': digest, 'paths': paths} for digest, paths in sorted(by_hash.items()) if len(paths) > 1]
    for item in inspector.items:
        matches = by_hash[item['sha256']] if item.get('sha256') else []
        if len(matches) > 1:
            item['identical_copy_count'] = len(matches)
            if item.get('content_type') in LANGUAGES.values():
                item['roles'].append('duplicate implementation')
    moves = rename_evidence(root, commit)
    reverse = defaultdict(set)
    for move in moves:
        reverse[move['new_path']].add(move['old_path'])
    mapping = []
    for path in tracked:
        seen, todo = set(), [path]
        while todo:
            next_path = todo.pop()
            for old in reverse[next_path] - seen:
                seen.add(old)
                todo.append(old)
        mapping.append({'current_path': path, 'historical_paths': sorted(seen), 'destination': path,
                        'action': 'retain; no speculative relocation'})
    report = {'schema_version': 1, 'baseline_commit': commit,
              'scope': 'every tracked baseline Git blob and recursively detected ZIP member; all file bytes read and hashed, automated static classification only; no extraction/execution',
              'limitations': ['Reading every byte is not exhaustive manual semantic review; this inventory must not be represented as proof that every archived implementation works or is safe.',
                             'Feature ownership/roles are conservative content/path candidates, not behavioral or authorship proof.',
                             'Imports/exports/frameworks are static evidence: Python AST and lexical patterns for selected languages; dynamic imports and other languages require further review.',
                             'Upstream programs, dependency hooks and generated code were not executed.',
                             'Git rename similarity supports paths, not authorization of changes.',
                             'Repository account settings, live integrations, and untracked dependency caches are outside this artifact.',
                             'No runtime test result is inferred from content analysis.'],
              'limits': vars(inspector.limits),
              'totals': {'tracked_files': len(tracked), 'records': len(inspector.items),
                         'archives': len(inspector.archives), 'archive_entries': sum(a['entries'] for a in inspector.archives),
                         'archive_files': sum(a['files'] for a in inspector.archives),
                         'decompressed_bytes_read': inspector.bytes_read,
                         'duplicate_groups': len(duplicates), 'issues': len(inspector.issues)},
              'archives': inspector.archives, 'issues': inspector.issues, 'duplicate_groups': duplicates,
              'items': inspector.items}
    archive_mappings = [{'current_path': item['path'], 'destination': item['path'],
                         'action': 'retain compressed; no speculative relocation'}
                        for item in inspector.items if item.get('container')]
    return report, {'schema_version': 1, 'baseline_commit': commit, 'moves_observed_in_history': moves,
                    'files': mapping, 'archive_members': archive_mappings}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--ref', default='HEAD')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--path-map', type=Path, required=True)
    args = parser.parse_args()
    report, mapping = generate(args.root, args.ref)
    for path, payload in ((args.output, report), (args.path_map, mapping)):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps(report['totals'], sort_keys=True))


if __name__ == '__main__':
    main()
