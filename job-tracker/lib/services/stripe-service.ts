import { Stripe } from 'stripe';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: { priceId: string; amount: number };
    yearly: { priceId: string; amount: number };
  };
  features: string[];
  tier: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  billingCycle: 'monthly' | 'yearly';
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  paymentMethods: PaymentMethod[];
  defaultPaymentMethod?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  last4: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Invoice {
  id: string;
  customerId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  dueDate: Date;
  paidAt?: Date;
  hostedInvoiceUrl: string;
  invoicePdf: string;
}

export class StripeService {
  private stripe: Stripe;
  private subscriptionPlans: SubscriptionPlan[] = [];

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil',
    });
    this.initializePlans();
  }

  private initializePlans() {
    // In production, these would be fetched from Stripe or configured via environment
    this.subscriptionPlans = [
      {
        id: 'pro',
        name: 'Pro',
        description: 'Advanced features for serious job seekers',
        price: {
          monthly: { priceId: 'price_pro_monthly', amount: 2900 }, // $29.00
          yearly: { priceId: 'price_pro_yearly', amount: 29000 }   // $290.00
        },
        features: [
          '50 AI Job Analysis per month',
          '25 Salary Intelligence reports',
          '15 Interview Prep sessions',
          'Smart Recommendations',
          'Performance Analytics',
          'Priority Support'
        ],
        tier: 'pro'
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Complete solution for teams and organizations',
        price: {
          monthly: { priceId: 'price_enterprise_monthly', amount: 9900 }, // $99.00
          yearly: { priceId: 'price_enterprise_yearly', amount: 99000 }   // $990.00
        },
        features: [
          'Unlimited AI Features',
          'Team Collaboration',
          'Custom Integrations',
          'SSO Integration',
          'Dedicated Support',
          'API Access',
          'Custom Branding'
        ],
        tier: 'enterprise'
      }
    ];
  }

  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata
      });

      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name || undefined,
        paymentMethods: [],
        defaultPaymentMethod: customer.invoice_settings.default_payment_method as string || undefined
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;

      if (customer.deleted) {
        return null;
      }

      const paymentMethods = await this.getPaymentMethods(customerId);

      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name || undefined,
        paymentMethods,
        defaultPaymentMethod: customer.invoice_settings.default_payment_method as string || undefined
      };
    } catch (error) {
      console.error('Error retrieving customer:', error);
      return null;
    }
  }

  async createSubscription(
    customerId: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly',
    paymentMethodId?: string
  ): Promise<Subscription> {
    try {
      const plan = this.subscriptionPlans.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Invalid plan ID');
      }

      const priceId = billingCycle === 'monthly' ? plan.price.monthly.priceId : plan.price.yearly.priceId;

      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent']
      };

      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        planId,
        status: subscription.status as any,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        billingCycle
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      // Find the plan based on price ID
      const priceId = subscription.items.data[0]?.price.id;
      const plan = this.subscriptionPlans.find(p =>
        p.price.monthly.priceId === priceId || p.price.yearly.priceId === priceId
      );

      const billingCycle = plan?.price.yearly.priceId === priceId ? 'yearly' : 'monthly';

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        planId: plan?.id || 'unknown',
        status: subscription.status as any,
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        billingCycle
      };
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      return null;
    }
  }

  async cancelSubscription(subscriptionId: string, immediately: boolean = false): Promise<boolean> {
    try {
      if (immediately) {
        await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });
      }
      return true;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    }
  }

  async updateSubscription(subscriptionId: string, newPlanId: string, billingCycle: 'monthly' | 'yearly'): Promise<Subscription | null> {
    try {
      const plan = this.subscriptionPlans.find(p => p.id === newPlanId);
      if (!plan) {
        throw new Error('Invalid plan ID');
      }

      const priceId = billingCycle === 'monthly' ? plan.price.monthly.priceId : plan.price.yearly.priceId;

      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      const currentItemId = subscription.items.data[0].id;

      const updatedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: currentItemId,
          price: priceId
        }],
        proration_behavior: 'always_invoice'
      });

      return {
        id: updatedSubscription.id,
        customerId: updatedSubscription.customer as string,
        planId: newPlanId,
        status: updatedSubscription.status as any,
        currentPeriodStart: new Date((updatedSubscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((updatedSubscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: (updatedSubscription as any).cancel_at_period_end,
        billingCycle
      };
    } catch (error) {
      console.error('Error updating subscription:', error);
      return null;
    }
  }

  async addPaymentMethod(customerId: string, paymentMethodId: string): Promise<boolean> {
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      return true;
    } catch (error) {
      console.error('Error adding payment method:', error);
      return false;
    }
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const { data: paymentMethods } = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
      const defaultPaymentMethodId = customer.invoice_settings.default_payment_method as string;

      return paymentMethods.map(pm => ({
        id: pm.id,
        type: pm.type as 'card',
        last4: pm.card?.last4 || '',
        brand: pm.card?.brand,
        expiryMonth: pm.card?.exp_month,
        expiryYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPaymentMethodId
      }));
    } catch (error) {
      console.error('Error retrieving payment methods:', error);
      return [];
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<boolean> {
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });
      return true;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      return false;
    }
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      return false;
    }
  }

  async getInvoices(customerId: string, limit: number = 10): Promise<Invoice[]> {
    try {
      const { data: invoices } = await this.stripe.invoices.list({
        customer: customerId,
        limit
      });

      return invoices.map(invoice => ({
        id: invoice.id || '',
        customerId: invoice.customer as string,
        amount: (invoice as any).amount_paid || 0,
        currency: invoice.currency,
        status: invoice.status as any,
        dueDate: new Date(((invoice as any).due_date || invoice.created) * 1000),
        paidAt: (invoice as any).status_transitions?.paid_at ? new Date((invoice as any).status_transitions.paid_at * 1000) : undefined,
        hostedInvoiceUrl: (invoice as any).hosted_invoice_url || '',
        invoicePdf: (invoice as any).invoice_pdf || ''
      }));
    } catch (error) {
      console.error('Error retrieving invoices:', error);
      return [];
    }
  }

  async createPaymentIntent(amount: number, currency: string = 'usd', customerId?: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        automatic_payment_methods: { enabled: true }
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret!
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  async createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });

      return session.url;
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
    mode: 'payment' | 'subscription' = 'subscription'
  ): Promise<string> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode,
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto'
      });

      return session.url!;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  async handleWebhook(payload: string, signature: string, webhookSecret: string): Promise<any> {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          // Handle subscription changes
          console.log('Subscription event:', event.type, event.data.object);
          break;

        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          // Handle payment events
          console.log('Payment event:', event.type, event.data.object);
          break;

        case 'customer.created':
        case 'customer.updated':
          // Handle customer events
          console.log('Customer event:', event.type, event.data.object);
          break;

        default:
          console.log('Unhandled event type:', event.type);
      }

      return event;
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw new Error('Failed to handle webhook');
    }
  }

  getSubscriptionPlans(): SubscriptionPlan[] {
    return this.subscriptionPlans;
  }

  getSubscriptionPlan(planId: string): SubscriptionPlan | null {
    return this.subscriptionPlans.find(plan => plan.id === planId) || null;
  }

  calculateProration(currentPlanId: string, newPlanId: string, billingCycle: 'monthly' | 'yearly'): number {
    const currentPlan = this.getSubscriptionPlan(currentPlanId);
    const newPlan = this.getSubscriptionPlan(newPlanId);

    if (!currentPlan || !newPlan) return 0;

    const currentPrice = billingCycle === 'monthly' ? currentPlan.price.monthly.amount : currentPlan.price.yearly.amount;
    const newPrice = billingCycle === 'monthly' ? newPlan.price.monthly.amount : newPlan.price.yearly.amount;

    // Simplified proration calculation
    const daysInPeriod = billingCycle === 'monthly' ? 30 : 365;
    const remainingDays = 15; // Simplified - would calculate based on actual period

    const currentProration = (currentPrice / daysInPeriod) * remainingDays;
    const newProration = (newPrice / daysInPeriod) * remainingDays;

    return Math.max(0, newProration - currentProration);
  }
}

// Initialize with environment variable
let stripeService: StripeService | null = null;

export function getStripeService(): StripeService {
  if (!stripeService) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeService = new StripeService(secretKey);
  }
  return stripeService;
}