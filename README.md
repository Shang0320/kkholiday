# KKHoliday 雙梯次名額全天候 24H 雲端自動監控與 Telegram 即時推播系統

專為監控 **KKHoliday 太平山山毛櫸步道一日遊（ILN34）** 精準打造的雙梯次名額即時巡檢系統。

## 🌟 核心特點
1. **GitHub Actions 24H 全自動背景巡檢**：完全不需要開電腦或開瀏覽器，GitHub 免費雲端每 5 分鐘自動執行一次爬蟲巡檢。
2. **Telegram 機器人即刻報警**：當監控梯次可售名額 >= 2 人時，自動發送格式化訊息與直達官方報名連結按鈕。
3. **夜間免打擾守護（23:00 ~ 08:00）**：台灣時間夜間時段維持背景巡檢，但主動靜音不發推播，守護良好睡眠。
4. **雙梯次同步監控**：
   - 梯次 1：`2026/10/31 (六)`（產品代碼：`ILN34261031A`）
   - 梯次 2：`2026/10/24 (六)`（產品代碼：`ILN34261024A`）

---

## 🚀 如何部署至您的 GitHub 帳號（只需 2 分鐘）

### 步驟 1：建立新的 GitHub Repository
1. 開啟 [GitHub 建立新倉庫頁面](https://github.com/new)。
2. Repository name 輸入：`kkholiday-monitor`。
3. 設為 **Public** 或 **Private** 皆可。
4. 點擊 **Create repository**。

### 步驟 2：將代碼推送至您的 GitHub
在終端機（Terminal / PowerShell）中進入本專案資料夾，執行：
```bash
git init
git add .
git commit -m "feat: KKHoliday 24H autonomous monitor with GitHub Actions"
git branch -M main
git remote add origin https://github.com/您的GitHub帳號/kkholiday-monitor.git
git push -u origin main
```

### 步驟 3：設定 Telegram 變數（可選，代碼已預載您的專屬 Bot）
如果想透過 GitHub Secrets 安全管理，請至倉庫頁面：
- **Settings** -> **Secrets and variables** -> **Actions**
- 新增 `TELEGRAM_BOT_TOKEN`：`8887558205:AAGwaaNTJRx3DnPncPFvoLzWN7TJiFZ2_4o`
- 新增 `TELEGRAM_CHAT_ID`：`1177409998`

### 步驟 4：啟用與測試 GitHub Actions
1. 點擊倉庫頂部的 **Actions** 分頁。
2. 在左側選單點選 **KKHoliday 24H Autonomous Monitor**。
3. 點擊右側的 **Run workflow** 綠色按鈕即可立即手動觸發測試！
4. 系統此後每 5 分鐘將在 GitHub 雲端自動值班巡檢。
