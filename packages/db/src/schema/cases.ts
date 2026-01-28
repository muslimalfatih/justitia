import { pgTable, text, uuid, varchar, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from './auth'

export const caseStatusEnum = pgEnum('case_status', ['open', 'engaged', 'closed', 'cancelled'])
export const caseCategoryEnum = pgEnum('case_category', [
  'contract',
  'family',
  'corporate',
  'criminal',
  'civil',
  'property',
  'employment',
  'immigration',
  'intellectual_property',
  'other'
])

export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: text('client_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  category: caseCategoryEnum('category').notNull(),
  description: text('description').notNull(),
  status: caseStatusEnum('status').notNull().default('open'),
  acceptedQuoteId: uuid('accepted_quote_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const casesRelations = relations(cases, ({ one, many }) => ({
  client: one(user, {
    fields: [cases.clientId],
    references: [user.id],
  }),
  files: many(files),
}))

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => cases.id, { onDelete: 'cascade' }),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  storageKey: varchar('storage_key', { length: 512 }).notNull().unique(),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 50 }).notNull(),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
})

export const filesRelations = relations(files, ({ one }) => ({
  case: one(cases, {
    fields: [files.caseId],
    references: [cases.id],
  }),
}))

export type Case = typeof cases.$inferSelect
export type NewCase = typeof cases.$inferInsert
export type File = typeof files.$inferSelect
export type NewFile = typeof files.$inferInsert
