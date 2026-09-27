# KKHoliday 旅遊名額即時監控

完全以 GitHub 運作的手機監控介面：

- GitHub Pages：提供手機與電腦 UI
- GitHub Actions：每 5 分鐘抓取 KKHoliday 官方梯次
- Telegram：符合監控條件時由 Actions 背景推播
- 夜間免打擾：台灣時間 23:00–08:00 仍巡檢但不推播

正式介面：<https://shang0320.github.io/kkholiday/>

資料來源：<https://www.kkholiday.com.tw/EW/GO/GroupList.asp?mGrupCd=ILN34>

## 安全設定

Telegram 憑證不得寫入原始碼。請在 GitHub 倉庫的 `Settings → Secrets and variables → Actions` 建立：

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

若 Token 曾出現在 GitHub 提交紀錄，請先在 BotFather 撤銷並重發，再把新 Token 存入 Secret。

## 監控設定

編輯 [`config.json`](./config.json) 可調整兩個梯次、通知門檻、比較方式與夜間靜音時段。網頁內切換梯次只影響目前手機上的檢視；Telegram 背景排程以 `config.json` 為準。

## 本機驗證

```bash
npm install
node scripts/monitor.js
npm run lint
npm run build
```

靜態成品輸出至 `out/`。GitHub Actions 會自動建置並部署，不需要 Vercel 或其他雲端平台。
