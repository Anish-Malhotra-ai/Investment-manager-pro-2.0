# Supabase Setup Guide

This application has been migrated from PocketBase to Supabase. Follow these steps to set up your Supabase database:

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Create a new project
4. Note down your project URL and anon key

## 2. Set Up Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. For Stripe Checkout, add a backend endpoint URL (server or Supabase Edge Function) that creates checkout sessions:
   ```
   VITE_STRIPE_CHECKOUT_ENDPOINT=https://your-backend.example.com/create-checkout-session
   ```

## 3. Create Database Schema

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL script to create all tables and policies

## 4. Configure Row Level Security (RLS)

The schema includes RLS policies that ensure users can only access their own data. The policies are automatically created when you run the schema script.

## 5. Test the Application

1. Start the development server: `npm run dev`
2. Register a new user account
3. Test creating properties, loans, transactions, etc.
4. To test Stripe checkout, configure a backend endpoint that accepts `{ plan, productId, userId }` and returns `{ url }` for redirect. The SPA will navigate to Stripe Checkout and then back to `/#/checkout/result?status=success&plan=...`.

### Supabase Edge Function Outline (Create Checkout Session)

```ts
import Stripe from 'stripe';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2022-11-15',
});

const PRODUCT_TO_PRICE: Record<string, string> = {
  'prod_TKxXRKi02WpYrV': 'price_for_monthly',
  'prod_TKxbg6sZOnAH6V': 'price_for_yearly',
  'prod_TKxd2zJsqX3Nzk': 'price_for_lifetime',
};

serve(async (req) => {
  const { plan, productId, userId } = await req.json();
  const priceId = PRODUCT_TO_PRICE[productId];
  if (!priceId) return new Response('Invalid product', { status: 400 });

  const urlBase = new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: plan === 'lifetime' ? 'payment' : 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${urlBase}/#/checkout/result?status=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${urlBase}/#/checkout/result?status=cancel`,
    metadata: { userId, plan },
  });

  return new Response(JSON.stringify({ url: session.url }), { headers: { 'Content-Type': 'application/json' } });
});
```

For production, use Stripe webhooks to update `user_profiles.plan` securely after verifying payment.

## Database Tables Created

- `properties` - Property information
- `loans` - Loan records
- `transactions` - Financial transactions
- `expenses` - Expense tracking
- `rentals` - Rental information
- `agents` - Agent contacts
- `user_settings` - User preferences and settings

## Features Migrated

- ✅ User authentication (register/login/logout)
- ✅ Property management
- ✅ Loan tracking
- ✅ Transaction recording
- ✅ Expense management
- ✅ Rental tracking
- ✅ Agent management
- ✅ User settings
- ✅ Real-time subscriptions
- ✅ Row Level Security

## Notes

- All data is now stored in Supabase PostgreSQL database
- Authentication is handled by Supabase Auth
- Real-time updates are available through Supabase Realtime
- Row Level Security ensures data privacy between users