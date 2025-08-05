// lib/verify-shopify-webhook.ts
import crypto from 'crypto';

export function verifyShopifyWebhook(rawBody: string, hmacHeader: string, secret: string): boolean {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}
