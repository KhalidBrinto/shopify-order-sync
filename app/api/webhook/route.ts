// app/api/webhook/register-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import Shopify from 'shopify-api-node';

export async function GET(req: NextRequest) {
  try {
    const webhooks = await shopify.webhook.list({ format: "json" });

    return NextResponse.json({ webhooks });
  } catch (error) {
    console.error('Failed to fetch webhooks:', error);
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {

    const webhooks= await shopify.webhook.list({ format: "json" });

    // Delete all webhooks
    await Promise.all(
        webhooks.map((webhook: Shopify.IWebhook) => {
          return shopify.webhook.delete(webhook.id);
        })
      );

    return NextResponse.json({ webhooks });
  } catch (error) {
    console.error('Webhook deletion failed:', error);
    return NextResponse.json({ error: 'Failed to delete webhooks' }, { status: 500 });
  }
}
