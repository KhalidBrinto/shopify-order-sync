// app/api/webhook/orders-create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyShopifyWebhook } from '@/lib/verify-webhook';
import { PrismaClient } from '@prisma/client';
import { socketClient as socket} from '@/lib/socket-client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get('x-shopify-hmac-sha256') || '';

  const isVerified = verifyShopifyWebhook(rawBody, hmac, process.env.API_SECRET!);

  if (!isVerified) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  try {
    const shopifyOrderId = String(payload.id);

    // Find the order in your DB
    const order = await prisma.order.findUnique({
      where: { shopifyOrderId }
    });

    if (!order) {
      return new NextResponse('Order not found', { status: 404 });
    }

    // Process additions
    for (const addition of payload.line_items.additions) {
      // If you store Shopify line item IDs, use that. Otherwise, adjust as needed.
      await prisma.lineItem.updateMany({
        where: {
          orderId: order.id,
        },
        data: {
          quantity: { increment: addition.delta }
        }
      });
    }

    // Process removals
    for (const removal of payload.line_items.removals) {
      await prisma.lineItem.updateMany({
        where: {
          orderId: order.id,
        },
        data: {
          quantity: { decrement: removal.delta }
        }
      });
    }

    // handle zero or negative quantity (delete or set to zero)
    await prisma.lineItem.deleteMany({
      where: {
        orderId: order.id,
        quantity: { lte: 0 }
      }
    });

    console.log("Order updated");
    socket.emit('on-order-update', true)
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing order edit:', error);
    return new NextResponse('Internal Server Error', { status: 500 });

  }
}
