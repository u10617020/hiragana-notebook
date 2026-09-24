from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    required_files = [
        "index.html",
        "styles.css",
        "app.js",
        "manifest.webmanifest",
        "service-worker.js",
        "icons/icon.svg",
    ]
    for relative in required_files:
        require((ROOT / relative).is_file(), f"缺少必要檔案：{relative}")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    worker = (ROOT / "service-worker.js").read_text(encoding="utf-8")
    manifest = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))

    kana_pairs = re.findall(r'\["([ぁ-ん])",\s*"([a-z]+)"\]', app)
    characters = [character for character, _ in kana_pairs]
    require(len(kana_pairs) == 46, f"應有 46 個假名，目前是 {len(kana_pairs)} 個")
    require(len(set(characters)) == 46, "假名表中有重複字元")
    require(characters[0] == "あ" and characters[-1] == "ん", "假名順序起訖不正確")

    expected_special = {"し": "shi", "ち": "chi", "つ": "tsu", "ふ": "fu", "を": "wo", "ん": "n"}
    actual = dict(kana_pairs)
    require(all(actual.get(kana) == romaji for kana, romaji in expected_special.items()), "特殊羅馬拼音不正確")

    require('const TRACE_CELLS = 3' in app, "描字格數不是 3")
    require('const TOTAL_CELLS = 8' in app, "總格數不是 8")
    require('touch-action: none' in (ROOT / "styles.css").read_text(encoding="utf-8"), "畫布未停用觸控捲動")
    require('localStorage.setItem' in app and 'lastPracticed' in app, "本機進度儲存不完整")
    require('speechSynthesis' in app and 'ja-JP' in app, "日文朗讀功能不完整")

    require(manifest.get("display") == "standalone", "PWA display 必須是 standalone")
    require(manifest.get("start_url") == "./", "PWA start_url 不正確")
    cached_paths = set(re.findall(r'"(\./[^"\n]+)"', worker))
    for path in ["./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./icons/icon.svg"]:
        require(path in cached_paths, f"離線快取缺少：{path}")

    html_ids = set(re.findall(r'id="([^"]+)"', html))
    queried_ids = set(re.findall(r'querySelector\("#([^"\)]+)"\)', app))
    require(queried_ids <= html_ids, f"JavaScript 查詢了不存在的元素：{sorted(queried_ids - html_ids)}")

    print("PASS: 46 音、畫布設定、進度儲存、朗讀與 PWA 檔案檢查通過")


if __name__ == "__main__":
    main()
