// app/api/webhook/register-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';

export async function GET(req: NextRequest) {
  try {
    const BASE_URL = process.env.NGROK_PUBLIC_APP_URL!;
    const webhooks = await Promise.all([
      shopify.webhook.create({
        topic: 'orders/create',
        address: `${BASE_URL}/api/webhook/orders-create`,
        format: 'json',
      }),
      shopify.webhook.create({
        topic: 'orders/edited',
        address: `${BASE_URL}/api/webhook/orders-edited`,
        format: 'json',
      }),
    ]);

    return NextResponse.json({ webhooks });
  } catch (error) {
    console.error('Webhook registration failed:', error);
    return NextResponse.json({ error: 'Failed to register webhooks' }, { status: 500 });
  }
}
