"""Package the optional Chrome/Edge tab-group companion for download."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parent.parent
destination = ROOT / 'downloads' / 'highst-tab-groups.zip'
destination.parent.mkdir(exist_ok=True)
with ZipFile(destination, 'w', ZIP_DEFLATED) as archive:
    for name in ['manifest.json', 'background.js', 'content.js', 'README.md']:
        archive.write(ROOT / 'extension' / name, name)
print(destination)
