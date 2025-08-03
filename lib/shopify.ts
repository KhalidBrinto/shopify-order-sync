import Shopify from 'shopify-api-node';

export const shopify = new Shopify({
  shopName: process.env.SHOPIFY_STORE!,
  accessToken:process.env.ACCESS_TOKEN!,

});

console.log(process.env.ACCESS_TOKEN);


