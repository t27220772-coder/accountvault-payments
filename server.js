// ═══════════════════════════════════════════════
//  FRAGSTORE — STRIPE PAYMENT BACKEND
//  Deploy this FREE on render.com
// ═══════════════════════════════════════════════
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => res.json({ status: 'FragStore payment server running' }));

// Create payment intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', description, email } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency,
      description: description || 'FragStore Purchase',
      receipt_email: email || undefined,
      automatic_payment_methods: { enabled: true },
      metadata: { store: 'FragStore', description }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Payment intent error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Webhook (optional - for confirmed payment notifications)
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    console.log('✅ Payment succeeded:', pi.id, '$' + pi.amount/100, pi.receipt_email);
  }
  res.json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FragStore payment server running on port ${PORT}`));
