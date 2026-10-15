import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

export const kitchenWorkspaces = sqliteTable('kitchen_workspaces', {
  ownerId: text('owner_id').primaryKey(),
  revision: integer('revision').notNull().default(1),
  data: text('data').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const kitchenImports = sqliteTable('kitchen_imports', {
  ownerId: text('owner_id').notNull(),
  batchId: text('batch_id').notNull(),
  data: text('data').notNull(),
  importedAt: text('imported_at').notNull(),
}, table => [primaryKey({ columns: [table.ownerId, table.batchId] })])

export const billingAccounts = sqliteTable('billing_accounts', {
  ownerId: text('owner_id').primaryKey(),
  customerId: text('customer_id').notNull().unique(),
  updatedAt: text('updated_at').notNull(),
})

export const billingReceipts = sqliteTable('billing_receipts', {
  ownerId: text('owner_id').primaryKey(),
  subscriptionId: text('subscription_id'),
  status: text('status').notNull(),
  eventId: text('event_id').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const billingEvents = sqliteTable('billing_events', {
  eventId: text('event_id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  receivedAt: text('received_at').notNull(),
})
