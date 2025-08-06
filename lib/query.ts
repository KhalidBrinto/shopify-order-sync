import { shopify } from "@/lib/shopify";

interface OrderNode {
  id: string;
  name: string;
  createdAt: string;
  closed: boolean;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        sku: string;
      };
    }>;
  };
  shippingAddress: {
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
  billingAddress: {
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

interface OrdersResponse {
  orders: {
    edges: Array<{
      cursor: string;
      node: OrderNode;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

export const fetchOrdersGraphQL = async (cursor?: string): Promise<OrdersResponse> => {
    const query = `
      {
        orders(first: 10${cursor ? `, after: "${cursor}"` : ''}) {
          edges {
            cursor
            node {
              id
              name
              createdAt
              closed
              totalPriceSet { shopMoney { amount currencyCode } }
              customer { id email firstName lastName }
              lineItems(first: 100) {
                edges {
                  node {
                    title
                    quantity
                    sku
                  }
                }
              }
              shippingAddress {
                firstName lastName address1 address2 city province zip country phone
              }
              billingAddress {
                firstName lastName address1 address2 city province zip country phone
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await shopify.graphql(query);
    return response as OrdersResponse;
};
