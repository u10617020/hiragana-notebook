# 假名手帖

一個適合手機使用的平假名手寫練習 PWA。收錄基本 46 音，前 3 格描字、後 5 格默寫，進度只保存在使用者的裝置上。

## 線上使用

手機開啟：<https://u10617020.github.io/hiragana-notebook/>

開啟後可從瀏覽器選單加入主畫面，像一般 App 一樣使用。

## 在本機開啟

PWA 的離線功能需要透過 `http://` 或 `https://` 開啟，不能直接雙擊 HTML 檔案。若電腦有 Python，可在此資料夾執行：

```text
py -m http.server 4173
```

再用瀏覽器開啟 `http://localhost:4173/`。

## 部署

將整個資料夾原樣放到任何支援 HTTPS 的靜態網站服務即可，不需要建置步驟。`index.html`、`app.js`、`styles.css`、`manifest.webmanifest`、`service-worker.js` 和 `icons/` 必須維持相對位置。

## 使用方式

1. 從首頁選一個平假名，或使用「隨機複習」。
2. 前三格沿著淡字描寫，後五格不看提示默寫。
3. 每格至少寫一筆後，按「完成練習」。
4. 依自己的掌握程度標記「我會了」或「再練一下」。
5. iPhone 可從 Safari 的分享選單加入主畫面；Android 可從 Chrome 選單安裝。

## 隱私

不需帳號，也不會傳送或保存手寫筆跡。學習狀態、完成次數與最後練習時間只存放在瀏覽器的 `localStorage`。
