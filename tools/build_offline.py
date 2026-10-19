from __future__ import annotations

import base64
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT.parent / "假名手帖-離線版.html"


def replace_once(source: str, old: str, new: str) -> str:
    if source.count(old) != 1:
        raise ValueError(f"Expected one occurrence: {old}")
    return source.replace(old, new)


html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "styles.css").read_text(encoding="utf-8")
app = (ROOT / "app.js").read_text(encoding="utf-8")
quick = (ROOT / "quick.js").read_text(encoding="utf-8")
audio_paths = json.loads((ROOT / "audio" / "manifest.json").read_text(encoding="utf-8"))
audio = {
    path.removeprefix("./"): "data:audio/mpeg;base64," + base64.b64encode((ROOT / path.removeprefix("./")).read_bytes()).decode("ascii")
    for path in audio_paths
}

for tag in (
    '    <link rel="manifest" href="manifest.webmanifest" />\n',
    '    <link rel="icon" href="icons/icon.svg" type="image/svg+xml" />\n',
    '    <link rel="apple-touch-icon" href="icons/icon.svg" />\n',
):
    html = replace_once(html, tag, "")
html = replace_once(html, '    <link rel="stylesheet" href="styles.css?v=7" />', f"    <style>\n{css}\n    </style>")
html = replace_once(html, '        <a class="offline-download" href="offline.html" download="假名手帖-離線版.html">↓ 下載單檔離線版</a>\n', "")
html = replace_once(html, '    <script src="app.js?v=6" defer></script>', f"    <script>\nwindow.__OFFLINE_AUDIO__ = {json.dumps(audio, ensure_ascii=False)};\n{app}\n    </script>")
html = replace_once(html, '    <script src="quick.js?v=1" defer></script>', f"    <script>\n{quick}\n    </script>")
html = replace_once(html, '<title>假名手帖</title>', '<title>假名手帖（離線版）</title>')
OUTPUT.write_text(html, encoding="utf-8")
(ROOT / "offline.html").write_text(html, encoding="utf-8")
print(f"Created {OUTPUT} ({OUTPUT.stat().st_size:,} bytes, {len(audio)} audio files)")
