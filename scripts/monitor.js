import fs from 'node:fs/promises';
import path from 'node:path';

const SOURCE_URL = 'https://www.kkholiday.com.tw/EW/GO/GroupList.asp?mGrupCd=ILN34';
const CONFIG_PATH = path.join(process.cwd(), 'config.json');
const STATUS_PATH = path.join(process.cwd(), 'public', 'data', 'status.json');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const PREVIOUS_STATUS_URL = process.env.PREVIOUS_STATUS_URL || '';
const FORCE_NOTIFY = process.env.FORCE_NOTIFY === 'true';

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (GitHub Actions; KKHoliday seat monitor)',
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.7',
      'Cache-Control': 'no-cache',
    },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  return response.text();
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
    const availableMatch = block.match(/class="product_available"[^>]*>[\s\S]*?class="number">(\d+)<\/span>/);
    const priceMatch = block.match(/class="product_price"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/);
    const buttonMatch = block.match(/class=['"]btn (btn-[a-z0-9_-]+)['"][^>]*>([^<]+)<\/a>/);
    const daysMatch = block.match(/class="product_days">([^<]+)<\/div>/);
    const nameMatch = block.match(/class="product_num">[^<]+<\/span>\s*([^<\n\r]+)/);
    const availableSeats = availableMatch ? Number.parseInt(availableMatch[1], 10) : 0;

    items.push({
      code,
      name: nameMatch ? nameMatch[1].trim() : '太平山 山毛櫸一日遊',
      date: dateMatch ? dateMatch[1].trim() : '',
      days: daysMatch ? daysMatch[1].trim() : '1天',
      totalSeats: totalMatch ? Number.parseInt(totalMatch[1], 10) : 39,
      availableSeats,
      price: priceMatch ? priceMatch[1].trim() : '',
      buttonText: buttonMatch ? buttonMatch[2].trim() : availableSeats > 0 ? '報名' : '候補',
      buttonType: buttonMatch ? buttonMatch[1] : availableSeats > 0 ? 'btn-success' : 'btn-warning',
      isGuaranteed: block.includes('保證出團'),
      orderUrl: `https://www.kkholiday.com.tw/EW/GO/GroupOrder.asp?prodCd=${code}`,
      detailUrl: `https://www.kkholiday.com.tw/EW/GO/GroupDetail.asp?prodCd=${code}`,
      updatedAt: new Date().toISOString(),
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

function conditionMet(slot, availableSeats, found) {
  if (!slot.enabled || !found) return false;
  const threshold = Number(slot.minAvailableSeats ?? slot.minSeats ?? 1);
  const operator = slot.comparisonOperator || '>=';
  if (operator === '<=') return availableSeats > 0 && availableSeats <= threshold;
  if (operator === '<') return availableSeats > 0 && availableSeats < threshold;
  if (operator === '>') return availableSeats > threshold;
  return availableSeats >= threshold;
}

async function readPreviousStatus() {
  if (PREVIOUS_STATUS_URL) {
    try {
      const response = await fetch(`${PREVIOUS_STATUS_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (response.ok) return response.json();
    } catch (error) {
      console.warn(`Previous Pages snapshot unavailable: ${error.message}`);
    }
  }
  try {
    return JSON.parse(await fs.readFile(STATUS_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function sendTelegram(result, checkedAt) {
  const text = [
    '🚨 <b>【KKHoliday 名額監控提醒】</b>',
    `⏰ ${checkedAt.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`,
    '══════════════════',
    `<b>${escapeHtml(result.label)}</b>`,
    `梯次：${escapeHtml(result.targetDate)}`,
    `團號：${escapeHtml(result.targetCode)}`,
    `可售名額：<b>${result.availableSeats} 人</b>`,
    `條件：${escapeHtml(result.comparisonOperator)} ${result.minAvailableSeats} 人`,
    '══════════════════',
    `<a href="${result.orderUrl}"><b>立即前往官方報名</b></a>`,
  ].join('\n');

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
      reply_markup: { inline_keyboard: [[{ text: '⚡ 立即前往 KKHoliday 官方報名', url: result.orderUrl }]] },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.description || `Telegram HTTP ${response.status}`);
}

async function main() {
  const checkedAt = new Date();
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  const previous = await readPreviousStatus();
  const html = await fetchText(SOURCE_URL);
  const allGroups = parseKKHolidayHtml(html);
  if (allGroups.length === 0) throw new Error('KKHoliday 頁面格式可能已變更：未解析到任何梯次');

  const slots = (config.slots || []).map((slot, index) => ({
    id: slot.id || `slot_${index + 1}`,
    label: slot.label || `監控行程${index + 1}`,
    targetDate: slot.targetDate,
    targetCode: slot.targetCode,
    minAvailableSeats: Number(slot.minAvailableSeats ?? slot.minSeats ?? 1),
    comparisonOperator: slot.comparisonOperator || '>=',
    enabled: slot.enabled !== false,
  }));

  const slotResults = slots.map((slot) => {
    const targetGroup = allGroups.find((group) => group.code.toUpperCase() === slot.targetCode.toUpperCase())
      || allGroups.find((group) => group.date.includes(slot.targetDate.split(' ')[0]))
      || null;
    const availableSeats = targetGroup?.availableSeats ?? 0;
    return {
      slotId: slot.id,
      label: slot.label,
      targetGroup,
      targetDate: slot.targetDate,
      targetCode: slot.targetCode,
      minAvailableSeats: slot.minAvailableSeats,
      comparisonOperator: slot.comparisonOperator,
      availableSeats,
      isConditionMet: conditionMet(slot, availableSeats, Boolean(targetGroup)),
      orderUrl: targetGroup?.orderUrl || `https://www.kkholiday.com.tw/EW/GO/GroupOrder.asp?prodCd=${slot.targetCode}`,
    };
  });

  const notificationsConfigured = Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
  const taipeiHour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei', hour: '2-digit', hour12: false,
  }).format(checkedAt));
  const quiet = config.quietHours?.enabled !== false
    && (taipeiHour >= Number(config.quietHours?.startHour ?? 23) || taipeiHour < Number(config.quietHours?.endHour ?? 8));

  for (const result of slotResults) {
    const previousResult = previous?.slotResults?.find((item) => item.slotId === result.slotId);
    const transitioned = result.isConditionMet && previousResult && !previousResult.isConditionMet;
    if ((FORCE_NOTIFY && result.isConditionMet) || transitioned) {
      if (!notificationsConfigured) {
        console.warn(`Telegram Secrets not configured; skipped ${result.label}`);
      } else if (quiet) {
        console.log(`Quiet hours active; skipped Telegram for ${result.label}`);
      } else {
        await sendTelegram(result, checkedAt);
        console.log(`Telegram sent for ${result.label}`);
      }
    }
  }

  const status = {
    success: true,
    timestamp: checkedAt.toISOString(),
    previousTimestamp: previous?.timestamp || null,
    sourceUrl: SOURCE_URL,
    notificationsConfigured,
    slotResults,
    allGroups,
  };

  await fs.mkdir(path.dirname(STATUS_PATH), { recursive: true });
  await fs.writeFile(STATUS_PATH, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${allGroups.length} departures to ${STATUS_PATH}`);
}

main().catch((error) => {
  console.error(`Monitor failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
