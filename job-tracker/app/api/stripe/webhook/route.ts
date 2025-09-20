import { NextRequest, NextResponse } from 'next/server';
import { getStripeService } from '@/lib/services/stripe-service';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const stripeService = getStripeService();
    const event = await stripeService.handleWebhook(body, signature, webhookSecret);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

async function handleSubscriptionCreated(subscription: any) {
  console.log('Subscription created:', subscription.id);

  // Update user's subscription status in database
  // In production, this would update the user's tier and enable features
  try {
    // TODO: Update database with new subscription
    // await updateUserSubscription(subscription.customer, subscription.id, 'active');

    console.log(`User ${subscription.customer} subscription activated: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription creation:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log('Subscription updated:', subscription.id);

  try {
    // TODO: Update database with subscription changes
    // await updateUserSubscription(subscription.customer, subscription.id, subscription.status);

    console.log(`User ${subscription.customer} subscription updated: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('Subscription deleted:', subscription.id);

  try {
    // TODO: Downgrade user to free tier
    // await downgradeUser(subscription.customer);

    console.log(`User ${subscription.customer} subscription canceled: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}

async function handlePaymentSucceeded(invoice: any) {
  console.log('Payment succeeded:', invoice.id);

  try {
    // TODO: Update payment status and extend subscription
    // await recordPayment(invoice.customer, invoice.id, invoice.amount_paid);

    console.log(`Payment of ${invoice.amount_paid / 100} ${invoice.currency} succeeded for customer ${invoice.customer}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailed(invoice: any) {
  console.log('Payment failed:', invoice.id);

  try {
    // TODO: Handle failed payment - notify user, retry logic
    // await handleFailedPayment(invoice.customer, invoice.id);

    console.log(`Payment failed for customer ${invoice.customer}, invoice ${invoice.id}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleCustomerCreated(customer: any) {
  console.log('Customer created:', customer.id);

  try {
    // TODO: Update user record with Stripe customer ID
    // await updateUserStripeId(customer.email, customer.id);

    console.log(`Stripe customer created: ${customer.id} for ${customer.email}`);
  } catch (error) {
    console.error('Error handling customer creation:', error);
  }
}

async function handleCustomerUpdated(customer: any) {
  console.log('Customer updated:', customer.id);

  try {
    // TODO: Update user information
    // await updateUserInformation(customer.id, customer);

    console.log(`Stripe customer updated: ${customer.id}`);
  } catch (error) {
    console.error('Error handling customer update:', error);
  }
}