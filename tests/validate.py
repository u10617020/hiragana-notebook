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

    katakana_block = app.split("const characters = [", 1)[1].split("][rowIndex]", 1)[0]
    katakana_rows = re.findall(r'"([ァ-ン]{3,5})"', katakana_block)
    katakana = "".join(katakana_rows)
    require(len(katakana) == 46 and len(set(katakana)) == 46, "片假名表必須有 46 個不重複字元")
    require(katakana[0] == "ア" and katakana[-1] == "ン", "片假名順序起訖不正確")

    word_block = app.split("const WORD_GROUPS = [", 1)[1].split("const ALL_WORDS", 1)[0]
    words = re.findall(r'\["([^"\]]+)", "([^"\]]+)", "([^"\]]+)"\]', word_block)
    require(len(words) == 30, f"應有 30 個主題單詞，目前是 {len(words)} 個")
    require(len({word for word, _, _ in words}) == 30, "主題單詞有重複")
    for group in ["food", "animals", "daily"]:
        require(f'id: "{group}"' in app, f"缺少單詞主題：{group}")

    expected_special = {"し": "shi", "ち": "chi", "つ": "tsu", "ふ": "fu", "を": "wo", "ん": "n"}
    actual = dict(kana_pairs)
    require(all(actual.get(kana) == romaji for kana, romaji in expected_special.items()), "特殊羅馬拼音不正確")

    require('const TRACE_CELLS = 3' in app, "描字格數不是 3")
    require('const TOTAL_CELLS = 8' in app, "總格數不是 8")
    require('const WORD_TRACE_CELLS = 2' in app and 'const WORD_TOTAL_CELLS = 5' in app, "單詞練習格數不正確")
    require('function showActiveCell()' in app and 'cell.hidden = index !== activeCellIndex' in app, "練習畫面沒有單格切換")
    require('kanaLabel.textContent = character' in app and 'romajiLabel.textContent = romaji' in app, "選字頁未顯示假名與羅馬拼音")
    require('size * (course === "words" ? 0.01 : 0.017)' in app, "書寫筆畫未調細")
    require('touch-action: none' in (ROOT / "styles.css").read_text(encoding="utf-8"), "畫布未停用觸控捲動")
    require('localStorage.setItem' in app and 'lastPracticed' in app, "本機進度儲存不完整")
    require('hiragana-copybook:v1' in app and 'kana-notebook:v2' in app, "缺少舊進度遷移")
    require('entry.written = (entry.written || 0) + pads.length' in app, "書寫次數沒有逐格累計")
    require('speechSynthesis' in app and 'ja-JP' in app, "日文朗讀功能不完整")
    audio_paths = json.loads((ROOT / "audio" / "manifest.json").read_text(encoding="utf-8"))
    require(len(audio_paths) == 76 and len(set(audio_paths)) == 76, "應有 76 個獨立讀音檔")
    for path in audio_paths:
        audio_file = ROOT / path.removeprefix("./")
        require(audio_file.is_file() and audio_file.stat().st_size > 1000, f"讀音檔缺失或太小：{path}")

    require(manifest.get("display") == "standalone", "PWA display 必須是 standalone")
    require(manifest.get("start_url") == "./", "PWA start_url 不正確")
    cached_paths = set(re.findall(r'"(\./[^"\n]+)"', worker))
    for path in ["./index.html", "./styles.css?v=5", "./app.js?v=5", "./manifest.webmanifest", "./icons/icon.svg", "./audio/manifest.json"]:
        require(path in cached_paths, f"離線快取缺少：{path}")
    require('cache.addAll(manifest)' in worker, "讀音檔沒有加入離線快取")

    html_ids = set(re.findall(r'id="([^"]+)"', html))
    queried_ids = set(re.findall(r'querySelector\("#([^"\)]+)"\)', app))
    require(queried_ids <= html_ids, f"JavaScript 查詢了不存在的元素：{sorted(queried_ids - html_ids)}")

    print("PASS: 平片假名、30 個單詞、書寫紀錄、朗讀與 PWA 檔案檢查通過")


if __name__ == "__main__":
    main()
