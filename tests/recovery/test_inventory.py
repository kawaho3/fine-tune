import importlib.util
import io
from pathlib import Path
import stat
import sys
import unittest
import warnings
import zipfile

MODULE = Path(__file__).resolve().parents[2] / 'tools/recovery/inventory.py'
spec = importlib.util.spec_from_file_location('recovery_inventory', MODULE)
inventory = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = inventory
spec.loader.exec_module(inventory)


def archive(entries):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as stream:
        for name, content in entries:
            stream.writestr(name, content)
    return output.getvalue()


class InventorySecurityTests(unittest.TestCase):
    def test_traversal_and_windows_paths_are_never_extracted(self):
        inspector = inventory.Inspector()
        names = ['../outside.py', '/absolute', 'C:\\outside', '..\\outside']
        inspector.archive('a.zip', archive([(n, b'import os') for n in names]))
        self.assertEqual(len(inspector.items), 4)
        self.assertTrue(all(item['unsafe_path'] for item in inspector.items))
        self.assertEqual(len(inspector.issues), 4)

    def test_symlinks_are_data_only(self):
        link = zipfile.ZipInfo('link')
        link.create_system = 3
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        inspector = inventory.Inspector()
        inspector.archive('a.zip', archive([(link, b'/etc/passwd')]))
        self.assertTrue(inspector.items[0]['symlink'])
        self.assertEqual(inspector.items[0]['bytes'], 11)
        self.assertEqual(len(inspector.issues), 1)

    def test_decompression_and_total_budgets_are_enforced(self):
        inspector = inventory.Inspector(inventory.Limits(member_bytes=16, total_bytes=20))
        inspector.archive('a.zip', archive([('large', b'a'*17), ('first', b'a'*12), ('second', b'b'*12)]))
        self.assertEqual(inspector.bytes_read, 12)
        self.assertEqual(len(inspector.issues), 2)
        self.assertEqual(len(inspector.items), 3)

    def test_nested_archives_have_depth_limits_and_hashes(self):
        inner = archive([('source.py', b'import os\ndef run(): pass\n')])
        inspector = inventory.Inspector(inventory.Limits(archive_depth=1))
        inspector.archive('outer.zip', archive([('inner.zip', inner)]))
        self.assertEqual(len(inspector.archives), 1)
        self.assertEqual(len(inspector.items[0]['sha256']), 64)
        self.assertIn('nesting depth limit', inspector.issues[0]['reason'])
        inspector = inventory.Inspector()
        inspector.archive('outer.zip', archive([('inner.zip', inner)]))
        self.assertEqual(len(inspector.archives), 2)
        source = inspector.items[-1]
        self.assertEqual(source['imports'], ['os'])
        self.assertEqual(source['exports'], ['run'])

    def test_disguised_source_is_classified_without_execution(self):
        record = inventory.describe('agent/index.mjs.txt', b'export function run() {}', False)
        self.assertTrue(record['disguised_source'])
        self.assertEqual(record['content_type'], 'JavaScript')
        self.assertEqual(record['exports'], ['run'])

    def test_corruption_and_member_limit_are_explicit(self):
        inspector = inventory.Inspector()
        inspector.archive('bad.zip', b'not a ZIP')
        self.assertEqual(len(inspector.issues), 1)
        inspector = inventory.Inspector(inventory.Limits(archive_entries=1))
        inspector.archive('many.zip', archive([('a', b'a'), ('b', b'b')]))
        self.assertEqual(len(inspector.items), 0)
        self.assertEqual(len(inspector.issues), 1)

    def test_compression_ratio_and_duplicate_names_are_reported(self):
        inspector = inventory.Inspector(inventory.Limits(compression_ratio=2))
        inspector.archive('bomb.zip', archive([('bomb', b'0' * 10000)]))
        self.assertEqual(inspector.bytes_read, 0)
        self.assertIn('compression ratio', inspector.issues[0]['reason'])
        inspector = inventory.Inspector()
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            data = archive([('same', b'first'), ('same', b'second')])
        inspector.archive('duplicates.zip', data)
        self.assertEqual([item['bytes'] for item in inspector.items], [5, 6])
        self.assertTrue(all(item['duplicate_member_name'] for item in inspector.items))

    def test_directory_traversal_is_reported(self):
        inspector = inventory.Inspector()
        inspector.archive('directories.zip', archive([('../outside/', b'')]))
        self.assertEqual(inspector.items[0]['roles'], ['directory'])
        self.assertEqual(len(inspector.issues), 1)

    def test_unsupported_nested_archive_formats_are_explicit(self):
        inspector = inventory.Inspector()
        inspector.archive('a.zip', archive([('nested.gz', b'\x1f\x8bdata')]))
        self.assertEqual(len(inspector.items), 1)
        self.assertIn('gzip container hashed but nested members uninspected', inspector.issues[0]['reason'])
        for content, expected in ((b'BZh', 'bzip2'), (b'\xfd7zXZ\x00', 'xz'),
                                  (b'7z\xbc\xaf\x27\x1c', '7z'), (b'Rar!\x1a\x07', 'RAR'),
                                  (b'\x00' * 257 + b'ustar' + b'\x00', 'tar')):
            self.assertEqual(inventory.archive_format(content), expected)


if __name__ == '__main__':
    unittest.main()
