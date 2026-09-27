import { TourGroup } from './types';

export const DEFAULT_KEYWORD = 'ILN34';
export const DEFAULT_TARGET_DATE = '2026/10/31 (六)';
export const DEFAULT_TARGET_CODE = 'ILN34261031A';
export const TARGET_BASE_URL = 'https://www.kkholiday.com.tw';

export async function fetchKKHolidayGroups(keyword: string = DEFAULT_KEYWORD): Promise<TourGroup[]> {
  const url = `${TARGET_BASE_URL}/EW/GO/GroupList.asp?mGrupCd=${encodeURIComponent(keyword)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`KKHoliday 回應狀態異常: HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parseKKHolidayHtml(html);
}

export function parseKKHolidayHtml(html: string): TourGroup[] {
  const items: TourGroup[] = [];
  const seenCodes = new Set<string>();

  // Match each product item container
  const itemRegex = /<div class="product product_item item">([\s\S]*?)(?=<div class="product product_item item">|<div id="pageNav"|<\/body>|$)/g;
  let match: RegExpExecArray | null;

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
    const priceMatch = block.match(/class="product_price"[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/);
    const btnMatch = block.match(/class=['"]btn (btn-[a-z0-9_-]+)['"][^>]*>([^<]+)<\/a>/);
    const tagMatch = block.match(/class="label[^"]*">([^<]+)<\/span>/);
    const daysMatch = block.match(/class="product_days">([^<]+)<\/div>/);

    // Extract product name
    const nameMatch = block.match(/class="product_num">[^<]+<\/span>\s*([^<\n\r]+)/);
    const name = nameMatch ? nameMatch[1].trim() : '太平山 山毛櫸一日遊';

    const date = dateMatch ? dateMatch[1].trim() : '';
    const totalSeats = totalMatch ? parseInt(totalMatch[1], 10) : 39;
    const availableSeats = availMatch ? parseInt(availMatch[1], 10) : 0;
    const price = priceMatch ? priceMatch[1].trim() : '1,899';
    const buttonText = btnMatch ? btnMatch[2].trim() : (availableSeats > 0 ? '報名' : '候補');
    const buttonType = btnMatch ? btnMatch[1] : (availableSeats > 0 ? 'btn-success' : 'btn-warning');
    const isGuaranteed = block.includes('保證出團') || (tagMatch ? tagMatch[1].includes('保證出團') : false);
    const days = daysMatch ? daysMatch[1].trim() : '1天';

    items.push({
      code,
      name,
      date,
      days,
      totalSeats,
      availableSeats,
      price,
      buttonText,
      buttonType,
      isGuaranteed,
      orderUrl: `${TARGET_BASE_URL}/EW/GO/GroupOrder.asp?prodCd=${code}`,
      detailUrl: `${TARGET_BASE_URL}/EW/GO/GroupDetail.asp?prodCd=${code}`,
      updatedAt: new Date().toISOString(),
    });
  }

  // Sort chronologically by date
  items.sort((a, b) => {
    const parseDateNum = (dStr: string) => {
      const m = dStr.match(/(\d{4})\/(\d{2})\/(\d{2})/);
      return m ? parseInt(`${m[1]}${m[2]}${m[3]}`, 10) : 0;
    };
    return parseDateNum(a.date) - parseDateNum(b.date);
  });

  return items;
}
