import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_CHAT_ID } from '@/lib/types';

interface MonitoredSlotSummary {
  label: string;
  name: string;
  date: string;
  code: string;
  minSeats: number;
  comparisonOperator?: '>=' | '>';
  availableSeats?: number;
  totalSeats?: number;
  orderUrl?: string;
  isTriggered?: boolean;
}

interface NotifyRequestBody {
  channel?: 'telegram' | 'line_messaging' | 'webhook';
  telegramBotToken?: string;
  telegramChatId?: string;
  lineChannelAccessToken?: string;
  lineUserId?: string;
  webhookUrl?: string;
  isTest?: boolean;
  tourName?: string;
  targetDate?: string;
  availableSeats?: number;
  totalSeats?: number;
  orderUrl?: string;
  customMessage?: string;
  triggeredSlotLabel?: string;
  slotsInfo?: MonitoredSlotSummary[];
  quietHoursEnabled?: boolean;
  quietStartHour?: number; // e.g. 23
  quietEndHour?: number; // e.g. 8
}

export async function POST(req: NextRequest) {
  try {
    const body: NotifyRequestBody = await req.json();
    const {
      channel = 'telegram',
      telegramBotToken,
      telegramChatId,
      lineChannelAccessToken,
      lineUserId,
      webhookUrl,
      isTest = false,
      tourName = '太平山 山毛櫸一日遊（ILN34）',
      targetDate = '2026/10/31 (六)',
      availableSeats = 2,
      totalSeats = 39,
      orderUrl = 'https://www.kkholiday.com.tw/EW/GO/GroupOrder.asp?prodCd=ILN34261031A',
      customMessage,
      triggeredSlotLabel,
      slotsInfo,
      quietHoursEnabled = true,
      quietStartHour = 23,
      quietEndHour = 8,
    } = body;

    const now = new Date();
    const timeStr = now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    // Check Quiet Hours (Taiwan time 23:00 ~ 08:00) unless it's a user-initiated test notification
    if (!isTest && quietHoursEnabled) {
      // Get current hour in Taipei time (0 to 23)
      const taipeiHourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Taipei',
        hour: 'numeric',
        hour12: false,
      }).format(now);
      const currentTaipeiHour = parseInt(taipeiHourStr, 10);

      // Quiet hours condition: e.g. hour >= 23 OR hour < 8
      const isQuietTime = quietStartHour > quietEndHour
        ? (currentTaipeiHour >= quietStartHour || currentTaipeiHour < quietEndHour)
        : (currentTaipeiHour >= quietStartHour && currentTaipeiHour < quietEndHour);

      if (isQuietTime) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'quiet_hours',
          message: `目前為免打擾時段（${quietStartHour}:00 ~ 0${quietEndHour}:00），系統維持全時監控但不發送即時推播打擾。`,
          channel: '靜音免打擾保護',
        });
      }
    }

    // 1. PRIMARY CHANNEL: TELEGRAM BOT
    if (channel === 'telegram') {
      // Use user-provided token or fallback to hardcoded default
      const botToken = (telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
      const chatId = (telegramChatId || DEFAULT_TELEGRAM_CHAT_ID).trim();

      if (!botToken || !chatId) {
        return NextResponse.json({
          success: false,
          error: '請填寫 Telegram Bot Token 與 Chat ID。',
        }, { status: 400 });
      }

      let tgHtml = '';

      if (isTest) {
        // Formatted structured message with the requested delimiter syntax
        tgHtml = `
🔔 <b>【KKHoliday 雙梯次監控】Telegram 測試推播</b>
══════════════════
✅ 系統已成功連線至您的 Telegram 帳號！
⏰ 測試時間：${timeStr}

監控行程1:
梯次日期：<b>2026/10/31 (六)</b> (ILN34261031A)
行程名稱：太平山 山毛櫸一日遊
觸發條件：可售人數 &gt; 1 人 (釋出 2 人即通知)
----
監控行程2:
梯次日期：<b>2026/10/24 (六)</b> (ILN34261024A)
行程名稱：太平山 山毛櫸一日遊
觸發條件：可售人數 &gt; 1 人 (釋出 2 人即通知)
══════════════════
⚡ 系統每 30 秒自動向 KKHoliday 官網檢查，一旦有任何名額釋出將零時差推播搶票！
`.trim();
      } else if (customMessage) {
        tgHtml = `<b>【KKHoliday 監控通知】</b>\n\n${customMessage}`;
      } else {
        // Real or Simulated Alert: Clear segment layout adhering to user request
        const slot1: MonitoredSlotSummary = slotsInfo?.[0] || {
          label: '監控行程1',
          name: tourName,
          date: targetDate,
          code: 'ILN34261031A',
          minSeats: 1,
          availableSeats: availableSeats,
          isTriggered: true,
        };

        const slot2: MonitoredSlotSummary = slotsInfo?.[1] || {
          label: '監控行程2',
          name: tourName,
          date: '2026/10/24 (六)',
          code: 'ILN34261024A',
          minSeats: 1,
          availableSeats: 0,
          isTriggered: false,
        };

const formatCondition = (slot: MonitoredSlotSummary) => {
    const op = slot.comparisonOperator;
    let opHtml = '&gt;=';
    if ((op as string) === '>') {
      opHtml = '&gt; (大於)';
    }
    return `可售人數 ${opHtml} ${slot.minSeats} 人`;
  };
       
        const alertHeader = triggeredSlotLabel
          ? `🚨 <b>【KKHoliday 名額釋出警報！】${triggeredSlotLabel}</b>`
          : `🚨 <b>【KKHoliday 名額釋出警報！】</b>`;

        tgHtml = `
${alertHeader}
⏰ 偵測時間：${timeStr}
══════════════════
監控行程1:
梯次日期：<b>${slot1.date}</b>
行程名稱：${tourName}
可售名額：<b>${slot1.isTriggered ? `🔥 ${availableSeats} 人 (釋出！)` : `${slot1.availableSeats ?? 0} 人`}</b>
觸發條件：${formatCondition(slot1)}
----
監控行程2:
梯次日期：<b>${slot2.date}</b>
行程名稱：${tourName}
可售名額：<b>${slot2.isTriggered ? `🔥 ${availableSeats} 人 (釋出！)` : `${slot2.availableSeats ?? 0} 人`}</b>
觸發條件：${formatCondition(slot2)}
══════════════════
👉 <a href="${orderUrl}"><b>【立即點擊直達官方報名填單】</b></a>

<i>名額稍縱即逝，請點擊上方連結立即進入搶填資料！</i>
`.trim();
      }

      // Inline keyboard with direct order link
      const inlineKeyboard = {
        inline_keyboard: [
          [
            {
              text: '⚡ 立即前往 KKHoliday 官方報名搶位',
              url: orderUrl,
            },
          ],
        ],
      };

      const tgApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const tgRes = await fetch(tgApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: tgHtml,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
          reply_markup: inlineKeyboard,
        }),
      });

      const tgData = await tgRes.json().catch(() => ({}));

      if (!tgRes.ok || !tgData.ok) {
        return NextResponse.json({
          success: false,
          error: `Telegram 發送失敗 (${tgRes.status}): ${tgData.description || '請確認 Token 與 Chat ID 正確，且已向 @shang_bot 先按過「Start」'}`,
          detail: tgData,
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        channel: 'Telegram Bot',
        message: 'Telegram 通知已成功發送！請檢查您的 Telegram 訊息。',
        detail: tgData,
      });
    }

    // 2. ALTERNATIVE: LINE Messaging API
    if (channel === 'line_messaging') {
      const accessToken = (lineChannelAccessToken || '').trim();
      if (!accessToken) {
        return NextResponse.json({
          success: false,
          error: '未提供 LINE Messaging API Channel Access Token。',
        }, { status: 400 });
      }

      let lineText = '';
      if (isTest) {
        lineText = `【KKHoliday 雙梯次監控】🔔 測試通知成功！\n\n監控行程1:\n梯次：2026/10/31 (六)\n觸發條件：可售 > 1 人\n----\n監控行程2:\n梯次：2026/10/24 (六)\n觸發條件：可售 > 1 人\n\n時間：${timeStr}`;
      } else {
        lineText = `【🚨 KKHoliday 名額釋出警報！】\n\n監控行程1:\n梯次：${targetDate}\n目前可售：🔥 ${availableSeats} 人\n觸發條件：可售 > 1 人\n----\n監控行程2:\n觸發條件：可售 > 1 人\n\n👉 立即報名搶位：\n${orderUrl}`;
      }

      const cleanUserId = (lineUserId || '').trim();
      const apiUrl = cleanUserId
        ? 'https://api.line.me/v2/bot/message/push'
        : 'https://api.line.me/v2/bot/message/broadcast';

      const payload = cleanUserId
        ? { to: cleanUserId, messages: [{ type: 'text', text: lineText }] }
        : { messages: [{ type: 'text', text: lineText }] };

      const lineRes = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const lineData = await lineRes.json().catch(() => ({}));

      if (!lineRes.ok) {
        return NextResponse.json({
          success: false,
          error: `LINE Messaging API 發送失敗 (${lineRes.status}): ${lineData.message || '請檢查 Token 與 User ID'}`,
          detail: lineData,
        }, { status: lineRes.status });
      }

      return NextResponse.json({
        success: true,
        channel: 'LINE Messaging API',
        message: 'LINE 訊息推播成功！',
        detail: lineData,
      });
    }

    // 3. ALTERNATIVE: Custom Webhook
    if (channel === 'webhook') {
      if (!webhookUrl || webhookUrl.trim() === '') {
        return NextResponse.json({
          success: false,
          error: '未提供 Webhook URL。',
        }, { status: 400 });
      }

      const isDiscord = webhookUrl.includes('discord.com');
      const isSlack = webhookUrl.includes('slack.com');

      let webhookPayload: Record<string, unknown>;

      if (isDiscord) {
        webhookPayload = {
          content: isTest ? '🔔 Telegram / Webhook 連線測試成功' : `🚨 KKHoliday 名額釋出！可售 ${availableSeats} 人`,
          embeds: [
            {
              title: isTest ? '🔔 KKHoliday 雙梯次監控測試' : '🚨 KKHoliday 名額釋出！',
              description: `**監控行程1:**\n梯次：${targetDate}\n可售名額：${availableSeats} / ${totalSeats}\n觸發條件：可售 > 1 人\n----\n**監控行程2:**\n觸發條件：可售 > 1 人`,
              url: orderUrl,
              color: 0x0284c7,
              fields: [
                { name: '搶票網址', value: `[立即報名搶位](${orderUrl})` },
                { name: '時間', value: timeStr },
              ],
            },
          ],
        };
      } else if (isSlack) {
        webhookPayload = {
          text: `🚨【KKHoliday 名額釋出】${tourName} (${targetDate}) 可售名額: ${availableSeats} 人！立即報名: ${orderUrl}`,
        };
      } else {
        webhookPayload = {
          tourName,
          targetDate,
          availableSeats,
          totalSeats,
          orderUrl,
          isTest,
          timestamp: timeStr,
        };
      }

      const hookRes = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      if (!hookRes.ok) {
        return NextResponse.json({
          success: false,
          error: `Webhook 發送失敗 (HTTP ${hookRes.status})`,
        }, { status: hookRes.status });
      }

      return NextResponse.json({
        success: true,
        channel: 'Custom Webhook',
        message: 'Webhook 通知發送成功！',
      });
    }

    return NextResponse.json({
      success: false,
      error: '不支援的推播管道類型',
    }, { status: 400 });
  } catch (error: unknown) {
    const errText = error instanceof Error ? error.message : '內部處理錯誤';
    return NextResponse.json({
      success: false,
      error: `推播發送失敗: ${errText}`,
    }, { status: 500 });
  }
}
