import { NextRequest, NextResponse } from 'next/server';
import { holidayDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('start');
    const endDate = url.searchParams.get('end');

    let holidays;
    if (startDate && endDate) {
      holidays = holidayDB.getByDateRange(startDate, endDate);
    } else {
      holidays = holidayDB.getAll();
    }

    return NextResponse.json({ holidays });
  } catch (error) {
    console.error('Failed to fetch holidays:', error);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}
