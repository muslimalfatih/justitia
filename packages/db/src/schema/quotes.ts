import { pgTable, uuid, numeric, integer, text, timestamp, pgEnum, varchar } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from './auth'
import { cases } from './cases'

export const quoteStatusEnum = pgEnum('quote_status', ['proposed', 'accepted', 'rejected'])
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'succeeded', 'failed'])

export const quotes = pgTable('quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => cases.id, { onDelete: 'cascade' }),
  lawyerId: text('lawyer_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  expectedDays: integer('expected_days').notNull(),
  note: text('note'),
  status: quoteStatusEnum('status').notNull().default('proposed'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  case: one(cases, {
    fields: [quotes.caseId],
    references: [cases.id],
  }),
  lawyer: one(user, {
    fields: [quotes.lawyerId],
    references: [user.id],
  }),
  payments: many(payments),
}))

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => cases.id, { onDelete: 'cascade' }),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  clientId: text('client_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  lawyerId: text('lawyer_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }).unique().notNull(),
  clientSecret: varchar('client_secret', { length: 255 }),
  status: paymentStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const paymentsRelations = relations(payments, ({ one }) => ({
  case: one(cases, {
    fields: [payments.caseId],
    references: [cases.id],
  }),
  quote: one(quotes, {
    fields: [payments.quoteId],
    references: [quotes.id],
  }),
  client: one(user, {
    fields: [payments.clientId],
    references: [user.id],
    relationName: 'client_payments',
  }),
  lawyer: one(user, {
    fields: [payments.lawyerId],
    references: [user.id],
    relationName: 'lawyer_payments',
  }),
}))

export type Quote = typeof quotes.$inferSelect
export type NewQuote = typeof quotes.$inferInsert
export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
