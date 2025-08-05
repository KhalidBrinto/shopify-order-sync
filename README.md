# Clicko Digital - Shopify Order Sync App

This project synchronizes Shopify order data into a MySQL database using webhooks and real-time updates powered by Socket.IO and Next.js.

---

## Step 1: Environment Setup

1. **Install dependencies**  
   ```bash
   npm install
   ```

2. **Create `.env` file**  

   Refer to the env-example.txt file and fill in your credentials

---

## Step 2: Setup and Migrate Database (Prisma + MySQL)

1. **Run the Prisma migration command to initialize your schema:**  

   ```bash
   npx prisma migrate dev --name init
   ```

---

## Step 3: Start WebSocket Server
Run the websocket server in a separate terminal using the following command.


```bash
npm run websocket
```
This will start a real-time socket server to stream order updates.

---

## Step 4: Start Next.js Development Server

Run the Next.js server (API + frontend) with:

```bash
npm run dev
```

---

## Step 5: Expose Server Publicly via Ngrok

Shopify needs a public endpoint to send webhooks. 

Note: Ngrok must be installed in your system.

Start Ngrok with:

```bash
ngrok http http://localhost:3000
```

> Use the `https://` URL from Ngrok in your webhook callback setup.

---

## Step 6: Register Shopify Webhooks

To register webhooks (e.g. for `orders/create`), send a GET request to:

```
/api/webhook/register-webhook
```

Example:

```bash
curl https://your-ngrok-url.ngrok.io/api/webhook/register-webhook
```

or

```bash
curl http://loacalhost:3000/api/webhook/register-webhook
```

---

## Step 7: Open the Web App

Visit the site at:

```
http://localhost:3000
```

You will see live order updates as they come in.

---

## .env File Example

```
DATABASE_URL="mysql://user:password@localhost:3306/db_name"
API_KEY=your-api-key
API_SECRET=your-api-secret
ACCESS_TOKEN=your-access-token
SHOPIFY_STORE=your-store.myshopify.com
NGROK_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
```

---

## Tech Stack

- **Next.js** (App Router)
- **Prisma** + **MySQL**
- **Shopify Admin API + Webhooks**
- **Socket.IO** (WebSockets)
- **Ngrok** (for local webhook testing)

---
