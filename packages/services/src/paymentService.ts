import Stripe from 'stripe'
import { env } from '@justitia/env/server'
import { db, payments, quotes, cases, eq, and } from '@justitia/db'
import { TRPCError } from '@trpc/server'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
})

/**
 * Create a Stripe Payment Intent for a quote
 */
export async function createPaymentIntent(
  quoteId: string,
  clientId: string
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  // Fetch quote with case information
  const quoteRecord = await db
    .select({
      quote: quotes,
      case: cases,
    })
    .from(quotes)
    .innerJoin(cases, eq(quotes.caseId, cases.id))
    .where(and(eq(quotes.id, quoteId), eq(quotes.status, 'proposed')))
    .limit(1)

  if (!quoteRecord.length || !quoteRecord[0]) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Quote not found or already processed',
    })
  }

  const record = quoteRecord[0]
  const quote = record.quote
  const caseData = record.case

  // Verify client owns the case
  if (caseData.clientId !== clientId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to accept this quote',
    })
  }

  // Verify case is still open
  if (caseData.status !== 'open') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Case is no longer open for quotes',
    })
  }

  // Calculate amount in cents
  const amountInCents = Math.round(Number(quote.amount) * 100)

  try {
    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        quoteId: quote.id,
        caseId: caseData.id,
        clientId,
        lawyerId: quote.lawyerId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Create payment record in database
    await db.insert(payments).values({
      caseId: caseData.id,
      quoteId: quote.id,
      clientId,
      lawyerId: quote.lawyerId,
      amount: quote.amount,
      stripePaymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: 'pending',
    })

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    }
  } catch (error) {
    console.error('Stripe payment intent creation error:', error)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to create payment intent',
    })
  }
}

/**
 * Handle Stripe webhook events (payment success)
 */
export async function handlePaymentWebhook(event: Stripe.Event): Promise<void> {
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const { quoteId, caseId } = paymentIntent.metadata as {
      quoteId: string
      caseId: string
    }

    try {
      // Atomic transaction to update payment, quote, and case
      await db.transaction(async (tx) => {
        // 1. Mark payment as succeeded
        await tx
          .update(payments)
          .set({
            status: 'succeeded',
            updatedAt: new Date(),
          })
          .where(eq(payments.stripePaymentIntentId, paymentIntent.id))

        // 2. Reject all other proposed quotes for this case
        await tx
          .update(quotes)
          .set({
            status: 'rejected',
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(quotes.caseId, caseId),
              eq(quotes.status, 'proposed')
            )
          )

        // 3. Accept the paid quote
        await tx
          .update(quotes)
          .set({
            status: 'accepted',
            updatedAt: new Date(),
          })
          .where(eq(quotes.id, quoteId))

        // 4. Update case status to engaged
        await tx
          .update(cases)
          .set({
            status: 'engaged',
            acceptedQuoteId: quoteId,
            updatedAt: new Date(),
          })
          .where(eq(cases.id, caseId))
      })

      console.log(`Payment succeeded for case ${caseId}, quote ${quoteId}`)
    } catch (error) {
      console.error('Error processing payment webhook:', error)
      throw error
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent

    try {
      // Mark payment as failed
      await db
        .update(payments)
        .set({
          status: 'failed',
          updatedAt: new Date(),
        })
        .where(eq(payments.stripePaymentIntentId, paymentIntent.id))

      console.log(`Payment failed for intent ${paymentIntent.id}`)
    } catch (error) {
      console.error('Error handling failed payment:', error)
      throw error
    }
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret not configured')
  }

  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

/**
 * Get payment status for a case
 */
export async function getPaymentStatus(caseId: string, userId: string) {
  const payment = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.caseId, caseId),
        eq(payments.clientId, userId)
      )
    )
    .limit(1)

  return payment[0] || null
}
