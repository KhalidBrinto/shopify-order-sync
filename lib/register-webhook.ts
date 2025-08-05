// pages/api/register-webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { shopify } from '@/lib/shopify';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const webhook = await shopify.webhook.create({
      topic: 'orders/create',
      address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/orders-create`,
      format: 'json',
    });

    res.status(200).json(webhook);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register webhook' });
  }
}
