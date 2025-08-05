import { NextRequest, NextResponse } from 'next/server';
import { verifyShopifyWebhook } from '@/lib/verify-webhook';
import { PrismaClient } from '@prisma/client';
import { emitNewOrder } from '@/lib/websocket-server';

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
    // 1. Upsert Customer
    const customerData = payload.customer
      ? {
        shopifyCustomerId: String(payload.customer.id),
        firstName: payload.customer.first_name,
        lastName: payload.customer.last_name,
        email: payload.customer.email,
      }
      : null;

    let customer = null;
    if (customerData) {
      customer = await prisma.customer.upsert({
        where: { shopifyCustomerId: customerData.shopifyCustomerId },
        update: {
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          email: customerData.email,
        },
        create: customerData,
      });
    }

    // 2. Upsert Order
    const orderData = payload ?
      {
        shopifyOrderId: String(payload.id),
        name: payload.name,
        totalPrice: payload.total_price ? parseFloat(payload.total_price) : null,
        currency: payload.currency,
        orderStatus: payload.fulfillment_status,
        createdAt: new Date(payload.created_at),
        updatedAt: new Date(payload.updated_at || payload.created_at),
      }
      : null;

    let order = null;
    if (orderData && customer) {
      order = await prisma.order.upsert({
        where: { shopifyOrderId: orderData.shopifyOrderId },
        update: {
          ...orderData,
          customer: {
            connect: { id: customer.id },
          },
        },
        create: {
          ...orderData,
          customer: {
            connect: { id: customer.id },
          },
        },
      });
    }

    // 3. Replace Line Items
    if (order && Array.isArray(payload.line_items)) {
      await prisma.lineItem.deleteMany({ where: { orderId: order.id } });
      for (const item of payload.line_items) {
        await prisma.lineItem.create({
          data: {
            orderId: order.id,
            title: item.title,
            quantity: item.quantity,
            price: item.price ? parseFloat(item.price) : null,
            sku: item.sku,
            productId: item.product_id ? String(item.product_id) : null,
            variantId: item.variant_id ? String(item.variant_id) : null,
          },
        });
      }
    }

    // 4. Replace Addresses
    if (order) {
      await prisma.address.deleteMany({ where: { orderId: order.id } });
    }

    if (order && payload.shipping_address) {
      await prisma.address.create({
        data: {
          orderId: order.id,
          type: 'shipping',
          firstName: payload.shipping_address.first_name,
          lastName: payload.shipping_address.last_name,
          address1: payload.shipping_address.address1,
          address2: payload.shipping_address.address2,
          city: payload.shipping_address.city,
          province: payload.shipping_address.province,
          zip: payload.shipping_address.zip,
          country: payload.shipping_address.country,
          phone: payload.shipping_address.phone,
        },
      });
    }

    if (order && payload.billing_address) {
      await prisma.address.create({
        data: {
          orderId: order.id,
          type: 'billing',
          firstName: payload.billing_address.first_name,
          lastName: payload.billing_address.last_name,
          address1: payload.billing_address.address1,
          address2: payload.billing_address.address2,
          city: payload.billing_address.city,
          province: payload.billing_address.province,
          zip: payload.billing_address.zip,
          country: payload.billing_address.country,
          phone: payload.billing_address.phone,
        },
      });
    }
    console.log("New order processed");
    console.log("Emitting new order to websocket");
    emitNewOrder(true);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error saving order:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}