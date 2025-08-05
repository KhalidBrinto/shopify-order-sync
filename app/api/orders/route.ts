import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page
    const skip = (validPage - 1) * validLimit;

    // Get total count for pagination metadata
    const totalCount = await prisma.order.count();
    
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        lineItems: true,
        addresses: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: validLimit,
    });

    const totalPages = Math.ceil(totalCount / validLimit);
    const hasNextPage = validPage < totalPages;
    const hasPrevPage = validPage > 1;

    return NextResponse.json({
      orders,
      pagination: {
        page: validPage,
        limit: validLimit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
} 