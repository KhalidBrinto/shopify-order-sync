import { shopify } from "@/lib/shopify";

interface OrderNode {
  id: string;
  name: string;
  createdAt: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
      };
    }>;
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
        orders(first: 5${cursor ? `, after: "${cursor}"` : ''}) {
          edges {
            cursor
            node {
              id
              name
              createdAt
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                firstName
                lastName
                email
              }
              lineItems(first: 5) {
                edges {
                  node {
                    title
                    quantity
                  }
                }
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
  