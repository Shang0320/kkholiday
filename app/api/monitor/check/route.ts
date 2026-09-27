import { NextRequest, NextResponse } from 'next/server';
import { fetchKKHolidayGroups, DEFAULT_KEYWORD, DEFAULT_TARGET_DATE, DEFAULT_TARGET_CODE, TARGET_BASE_URL } from '@/lib/scraper';
import { CheckResponse, SlotStatusResult, TourGroup } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();

  try {
    const body = await req.json().catch(() => ({}));
    const keyword = body.keyword || DEFAULT_KEYWORD;
    const slots = body.slots || [
      {
        id: 'slot_1',
        label: '目標梯次 1',
        targetDate: DEFAULT_TARGET_DATE,
        targetCode: DEFAULT_TARGET_CODE,
        minAvailableSeats: 1,
        enabled: true,
      },
    ];

    const allGroups = await fetchKKHolidayGroups(keyword);

    const slotResults: SlotStatusResult[] = slots.map((slot: { id: string; targetDate: string; targetCode: string; minAvailableSeats: number; comparisonOperator?: '>=' | '>' | '<=' | '<'; enabled: boolean }) => {
      let targetGroup: TourGroup | null = null;

      if (slot.targetCode) {
        targetGroup = allGroups.find(g => g.code.toUpperCase() === slot.targetCode.toUpperCase()) || null;
      }

      if (!targetGroup && slot.targetDate) {
        targetGroup = allGroups.find(g => g.date.includes(slot.targetDate) || slot.targetDate.includes(g.date)) || null;
      }

      const availableSeats = targetGroup ? targetGroup.availableSeats : 0;
      const minSeats = typeof slot.minAvailableSeats === 'number' ? slot.minAvailableSeats : 1;
      const operator = slot.comparisonOperator || '>=';

      let isConditionMet = false;
      if (slot.enabled && targetGroup) {
        if (operator === '<=') {
          // Alert when tickets are running low (availableSeats > 0 and <= threshold)
          // or if 0, tickets are gone
          isConditionMet = availableSeats > 0 && availableSeats <= minSeats;
        } else if (operator === '<') {
          isConditionMet = availableSeats > 0 && availableSeats < minSeats;
        } else if (operator === '>') {
          isConditionMet = availableSeats > minSeats;
        } else {
          // Default '>='
          isConditionMet = availableSeats >= minSeats;
        }
      }
      const orderUrl = targetGroup?.orderUrl || `${TARGET_BASE_URL}/EW/GO/GroupOrder.asp?prodCd=${slot.targetCode}`;

      return {
        slotId: slot.id,
        targetGroup,
        targetDate: slot.targetDate,
        targetCode: slot.targetCode,
        minAvailableSeats: minSeats,
        comparisonOperator: operator,
        availableSeats,
        isConditionMet,
        orderUrl,
      };
    });

    const response: CheckResponse = {
      success: true,
      timestamp,
      slotResults,
      allGroups,
      sourceUrl: `${TARGET_BASE_URL}/EW/GO/GroupList.asp?isWm=1&ikeyword=${encodeURIComponent(keyword)}`,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '無法連線至 KKHoliday 官方網站';
    console.error('Error fetching KKHoliday:', error);

    const errorResponse: CheckResponse = {
      success: false,
      timestamp,
      slotResults: [],
      allGroups: [],
      sourceUrl: `${TARGET_BASE_URL}/EW/GO/GroupList.asp?isWm=1&ikeyword=${DEFAULT_KEYWORD}`,
      error: errorMessage,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Keep GET for quick verification or legacy single-slot requests
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword') || DEFAULT_KEYWORD;
  const targetDate = searchParams.get('targetDate') || DEFAULT_TARGET_DATE;
  const targetCode = searchParams.get('targetCode') || DEFAULT_TARGET_CODE;
  const minSeats = parseInt(searchParams.get('minSeats') || '1', 10);

  const timestamp = new Date().toISOString();

  try {
    const allGroups = await fetchKKHolidayGroups(keyword);
    let targetGroup = allGroups.find(g => g.code.toUpperCase() === targetCode.toUpperCase()) || null;
    if (!targetGroup && targetDate) {
      targetGroup = allGroups.find(g => g.date.includes(targetDate) || targetDate.includes(g.date)) || null;
    }

    const availableSeats = targetGroup ? targetGroup.availableSeats : 0;
    const isConditionMet = targetGroup ? availableSeats > minSeats : false;

    const slotResults: SlotStatusResult[] = [
      {
        slotId: 'slot_1',
        targetGroup,
        targetDate,
        targetCode,
        minAvailableSeats: minSeats,
        availableSeats,
        isConditionMet,
        orderUrl: targetGroup?.orderUrl || `${TARGET_BASE_URL}/EW/GO/GroupOrder.asp?prodCd=${targetCode}`,
      },
    ];

    const response: CheckResponse = {
      success: true,
      timestamp,
      slotResults,
      allGroups,
      sourceUrl: `${TARGET_BASE_URL}/EW/GO/GroupList.asp?isWm=1&ikeyword=${encodeURIComponent(keyword)}`,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '無法連線至 KKHoliday 官方網站';
    return NextResponse.json({
      success: false,
      timestamp,
      slotResults: [],
      allGroups: [],
      sourceUrl: `${TARGET_BASE_URL}/EW/GO/GroupList.asp?isWm=1&ikeyword=${encodeURIComponent(keyword)}`,
      error: errorMessage,
    }, { status: 500 });
  }
}
