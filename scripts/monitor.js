import https from 'https';

// Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8887558205:AAGwaaNTJRx3DnPncPFvoLzWN7TJiFZ2_4o';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1177409998';
const KEYWORD = 'ILN34';
const QUIET_HOURS_ENABLED = process.env.QUIET_HOURS_ENABLED !== 'false'; // default true
const QUIET_START_HOUR = 23; // 23:00
const QUIET_END_HOUR = 8;    // 08:00

// Monitored target slots
const SLOTS = [
  {
    id: 'slot_1',
    label: '監控行程1',
    targetDate: '2026/10/31 (六)',
    targetCode: 'ILN34261031A',
    minSeats: 2,
    comparisonOperator: '>=',
  },
  {
    id: 'slot_2',
    label: '監控行程2',
    targetDate: '2026/10/24 (六)',
    targetCode: 'ILN34261024A',
    minSeats: 2,
    comparisonOperator: '>=',
  },
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseKKHolidayHtml(html) {
  const items = [];
  const seenCodes = new Set();
  const itemRegex = /<div class="product product_item item">([\s\S]*?)(?=<div class="product product_item item">|<div id="pageNav"|<\/body>|$)/g;
  let match;

  while ((match = itemRegex.exec(html)) !== null) {
    const block = match[1];
    const codeMatch = block.match(/class="product_num">([^<]+)<\/span>/);
    if (!codeMatch) continue;
    const code = codeMatch[1].trim();
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);

    const dateMatch = block.match(/class="product_date[^"]*">([^<]+)<\/div>/);
    const totalMatch = block.match(/class="product_total"[^>]*>[\s\S]*?class="number">(\d+)<\/span>/);
    const availMatch = block.match(/class="product_available"[^>]*>[\s\S]*?class="number">(\d+)<\/span>/);
    const nameMatch = block.match(/class="product_num">[^<]+<\/span>\s*([^<\n\r]+)/);

    items.push({
      code,
      name: nameMatch ? nameMatch[1].trim() : '太平山 山毛櫸一日遊',
      date: dateMatch ? dateMatch[1].trim() : '',
      totalSeats: totalMatch ? parseInt(totalMatch[1], 10) : 39,
      availableSeats: availMatch ? parseInt(availMatch[1], 10) : 0,
      orderUrl: `https://www.kkholiday.com.tw/EW/GO/GroupOrder.asp?prodCd=${code}`,
    });
  }

  return items;
}

async function sendTelegramMessage(text, inlineUrl) {
  const payload = JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '⚡ 立即前往 KKHoliday 官方報名搶位', url: inlineUrl }],
      ],
    },
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.ok === true);
        } catch {
          resolve(false);
        }
      });
    });

    req.on('error', () => resolve(false));
    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('🚀 開始執行 KKHoliday 雙梯次名額檢查...');
  const now = new Date();
  const taipeiTimeStr = now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const taipeiHourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    hour: 'numeric',
    hour12: false,
  }).format(now);
  const currentHour = parseInt(taipeiHourStr, 10);

  // Check Quiet Hours (23:00 ~ 08:00)
  const isQuietTime = currentHour >= QUIET_START_HOUR || currentHour < QUIET_END_HOUR;
  if (QUIET_HOURS_ENABLED && isQuietTime) {
    console.log(`🌙 目前為台灣時間免打擾時段 (${currentHour}:00)，僅執行排程巡檢，不發送即時推播打擾。`);
  }

  const url = `https://www.kkholiday.com.tw/EW/GO/GroupList.asp?isWm=1&ikeyword=${encodeURIComponent(KEYWORD)}`;
  const html = await fetchUrl(url);
  const groups = parseKKHolidayHtml(html);
  console.log(`✅ 成功抓取 KKHoliday 共 ${groups.length} 筆團次資料。`);

  let shouldAlert = false;
  let triggeredSlot = null;

  for (const slot of SLOTS) {
    const matched = groups.find((g) => g.code.toUpperCase() === slot.targetCode.toUpperCase())
      || groups.find((g) => g.date.includes(slot.targetDate.split(' ')[0]));
    const available = matched ? matched.availableSeats : 0;
    console.log(`📌 [${slot.label}] ${slot.targetDate} (${slot.targetCode}) 可售: ${available} 人 (條件: >= ${slot.minSeats})`);

    if (available >= slot.minSeats) {
      shouldAlert = true;
      if (!triggeredSlot) triggeredSlot = { slot, matched, available };
    }
  }

  if (shouldAlert && triggeredSlot) {
    console.log(`🚨 偵測到名額達標！準備發送 Telegram 通知...`);

    if (QUIET_HOURS_ENABLED && isQuietTime) {
      console.log('🌙 夜間免打擾生效中，暫緩推播。');
      return;
    }

    const message = `🚨 <b>【KKHoliday 名額釋出警報！】</b>\n` +
      `⏰ 偵測時間：${taipeiTimeStr}\n` +
      `══════════════════\n` +
      `<b>監控梯次:</b> ${triggeredSlot.slot.label}\n` +
      `<b>梯次日期:</b> ${triggeredSlot.slot.targetDate}\n` +
      `<b>可售名額:</b> 🔥 <b>${triggeredSlot.available} 人</b> (名額釋出！)\n` +
      `<b>報名連結:</b> <a href="${triggeredSlot.matched.orderUrl}">立即前往官網搶位</a>\n` +
      `══════════════════\n` +
      `<i>名額稍縱即逝，請點擊下方按鈕立即填單！</i>`;

    const success = await sendTelegramMessage(message, triggeredSlot.matched.orderUrl);
    console.log(`📬 Telegram 通知發送結果: ${success ? '成功' : '失敗'}`);
  } else {
    console.log('ℹ️ 目前監控梯次可售名額尚未釋出，狀態正常。');
  }
}

run().catch((err) => {
  console.error('❌ 執行失敗:', err);
  process.exit(1);
});
