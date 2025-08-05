// src/app/api/sync/route.ts
import { NextResponse } from 'next/server';
import { fetchOrdersGraphQL } from '@/lib/query';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to handle rate limits with exponential backoff
const handleRateLimit = async (retryCount: number = 0): Promise<void> => {
  if (retryCount >= MAX_RETRIES) {
    throw new Error('Max retries exceeded due to rate limiting');
  }
  
  const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount);
  console.log(`Rate limit hit, waiting ${backoffDelay}ms before retry ${retryCount + 1}`);
  await delay(backoffDelay);
};

// Define types for order node
interface OrderNode {
  id: string;
  name: string;
  createdAt: string;
  fulfillmentStatus: string;
  totalPriceSet?: {
    shopMoney?: {
      amount: string;
      currencyCode: string;
    };
  };
  customer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  lineItems?: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        sku: string;
      };
    }>;
  };
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    phone: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    phone: string;
  };
}

// Process and store a single order
const processAndStoreOrder = async (orderNode: OrderNode) => {
  try {
    // Extract order data
    const orderId = orderNode.id.split('/').pop();
    if (!orderId) {
      throw new Error('Invalid order ID');
    }
    
    const orderData = {
      shopifyOrderId: orderId,
      name: orderNode.name,
      totalPrice: orderNode.totalPriceSet?.shopMoney?.amount 
        ? parseFloat(orderNode.totalPriceSet.shopMoney.amount) 
        : null,
      currency: orderNode.totalPriceSet?.shopMoney?.currencyCode || 'USD',
      orderStatus: orderNode.fulfillmentStatus, // Default status
      createdAt: new Date(orderNode.createdAt),
    };

    // Process customer data
    const customerId = orderNode.customer?.id.split('/').pop();
    const customerData = orderNode.customer && customerId ? {
      shopifyCustomerId: customerId,
      firstName: orderNode.customer.firstName,
      lastName: orderNode.customer.lastName,
      email: orderNode.customer.email,
    } : null;

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Upsert customer
      let customer;
      if (customerData) {
        customer = await tx.customer.upsert({
          where: { shopifyCustomerId: customerData.shopifyCustomerId },
          update: {
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            email: customerData.email,
          },
          create: customerData,
        });
      }

      // Upsert order
      const order = await tx.order.upsert({
        where: { shopifyOrderId: orderData.shopifyOrderId },
        update: {
          name: orderData.name,
          totalPrice: orderData.totalPrice,
          currency: orderData.currency,
          orderStatus: orderData.orderStatus,
          customerId: customer?.id,
        },
        create: {
          ...orderData,
          customerId: customer?.id || 1, // Fallback customer ID
        },
      });

      // Process line items
      if (orderNode.lineItems?.edges) {
        // Delete existing line items for this order
        await tx.lineItem.deleteMany({
          where: { orderId: order.id },
        });

        // Create new line items
        for (const edge of orderNode.lineItems.edges) {
          const item = edge.node;
          await tx.lineItem.create({
            data: {
              orderId: order.id,
              title: item.title,
              quantity: item.quantity,
              sku: item.sku,
              price: null, // Price not available in current query
            },
          });
        }
      }

      // Process addresses
      if (orderNode.shippingAddress || orderNode.billingAddress) {
        // Delete existing addresses for this order
        await tx.address.deleteMany({
          where: { orderId: order.id },
        });

        // Create shipping address
        if (orderNode.shippingAddress) {
          await tx.address.create({
            data: {
              orderId: order.id,
              type: 'shipping',
              firstName: orderNode.shippingAddress.firstName,
              lastName: orderNode.shippingAddress.lastName,
              address1: orderNode.shippingAddress.address1,
              address2: orderNode.shippingAddress.address2,
              city: orderNode.shippingAddress.city,
              province: orderNode.shippingAddress.province,
              zip: orderNode.shippingAddress.zip,
              country: orderNode.shippingAddress.country,
              phone: orderNode.shippingAddress.phone,
            },
          });
        }

        // Create billing address
        if (orderNode.billingAddress) {
          await tx.address.create({
            data: {
              orderId: order.id,
              type: 'billing',
              firstName: orderNode.billingAddress.firstName,
              lastName: orderNode.billingAddress.lastName,
              address1: orderNode.billingAddress.address1,
              address2: orderNode.billingAddress.address2,
              city: orderNode.billingAddress.city,
              province: orderNode.billingAddress.province,
              zip: orderNode.billingAddress.zip,
              country: orderNode.billingAddress.country,
              phone: orderNode.billingAddress.phone,
            },
          });
        }
      }

      return order;
    });

    return result;
  } catch (error) {
    console.error('Error processing order:', orderNode.id, error);
    throw error;
  }
};

// Main sync function with pagination and rate limiting
const syncOrders = async () => {
  let cursor: string | undefined;
  let hasNextPage = true;
  let totalOrdersProcessed = 0;
  let totalOrdersCreated = 0;
  let totalOrdersUpdated = 0;
  const errors: string[] = [];

  console.log('Starting order sync...');

  while (hasNextPage) {
    try {
      // Fetch orders with pagination
      const result = await fetchOrdersGraphQL(cursor);
      
      if (!result.orders?.edges) {
        console.log('No orders found or invalid response');
        break;
      }

      const orders = result.orders.edges;
      console.log(`Processing ${orders.length} orders...`);

      for (const edge of orders) {
        try {
          const existingOrder = await prisma.order.findUnique({
            where: { shopifyOrderId: edge.node.id.split('/').pop() },
          });

          await processAndStoreOrder(edge.node);
          totalOrdersProcessed++;

          if (existingOrder) {
            totalOrdersUpdated++;
          } else {
            totalOrdersCreated++;
          }

          console.log(`Processed order: ${edge.node.name || edge.node.id}`);
        } catch (error) {
          const errorMsg = `Failed to process order ${edge.node.id}: ${error}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }

        // Rate limiting delay between individual orders
        await delay(RATE_LIMIT_DELAY);
      }

      // Update pagination info
      hasNextPage = result.orders.pageInfo.hasNextPage;
      cursor = result.orders.pageInfo.endCursor;

      console.log(`Completed page. Total processed: ${totalOrdersProcessed}`);
      
      // Additional delay between pages to be extra safe with rate limits
      if (hasNextPage) {
        await delay(RATE_LIMIT_DELAY * 2);
      }

    } catch (error: unknown) {
      // Handle rate limiting specifically
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('rate limit') || (error as { status?: number }).status === 429) {
        await handleRateLimit();
        continue; // Retry the same page
      }

      console.error('Error fetching orders page:', error);
      errors.push(`Failed to fetch orders page: ${errorMessage}`);
      break;
    }
  }

  console.log('Order sync completed!');
  return {
    totalOrdersProcessed,
    totalOrdersCreated,
    totalOrdersUpdated,
    errors,
  };
};

export async function GET() {
  try {
    console.log('Order sync request received');
    
    const result = await syncOrders();
    
    return NextResponse.json({
      success: true,
      message: 'Order sync completed successfully',
      ...result,
    });
  } catch (error: unknown) {
    console.error('Error during order sync:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync orders',
        details: errorMessage 
      }, 
      { status: 500 }
    );
  }
}
