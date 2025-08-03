// src/app/api/sync/route.ts
import { NextResponse } from 'next/server';
import { fetchOrdersGraphQL } from '@/lib/query';

export async function GET() {
  try {
    const result = await fetchOrdersGraphQL();
    return NextResponse.json(result);
  } catch (err) {
    console.error('Error fetching orders:', err);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
