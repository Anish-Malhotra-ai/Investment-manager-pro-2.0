// Simple StripeManager to initiate checkout via a backend or Supabase Edge Function
// IMPORTANT: Creating checkout sessions requires a server-side secret. This client calls
// a configured endpoint that must create the session and return { url } to redirect.

class StripeManager {
  static async createCheckoutSession({ plan, productId, userId }) {
    try {
      const endpoint = import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT;
      if (!endpoint) {
        return { success: false, error: 'Missing VITE_STRIPE_CHECKOUT_ENDPOINT in env' };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ plan, productId, userId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Checkout session request failed: ${text || res.status}`);
      }

      const data = await res.json();
      // Expect { url } to redirect to Stripe Checkout
      if (data?.url) {
        return { success: true, url: data.url };
      }

      return { success: false, error: 'No checkout URL returned from server' };
    } catch (error) {
      console.error('StripeManager.createCheckoutSession error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default StripeManager;