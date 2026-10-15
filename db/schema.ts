import { sqliteTable, text, integer, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const kitchenWorkspaces = sqliteTable('kitchen_workspaces', {
  ownerId: text('owner_id').primaryKey(),
  revision: integer('revision').notNull().default(1),
  data: text('data').notNull(),
  updatedAt: text('updated_at').notNull(),
  saveToken: text('save_token'),
})

export const inventoryEvents = sqliteTable('inventory_events', {
  ownerId: text('owner_id').notNull(),
  locationId: text('location_id').notNull().default('primary'),
  eventId: text('event_id').notNull(),
  kind: text('kind').notNull(),
  occurredOn: text('occurred_on').notNull(),
  recordedAt: text('recorded_at').notNull(),
  revision: integer('revision').notNull(),
  referenceId: text('reference_id'),
  requestHash: text('request_hash').notNull(),
  data: text('data').notNull(),
}, table => [
  primaryKey({ columns: [table.ownerId, table.locationId, table.eventId] }),
  index('inventory_events_owner_time').on(table.ownerId, table.locationId, table.recordedAt, table.eventId),
  uniqueIndex('inventory_events_reference').on(table.ownerId, table.locationId, table.kind, table.referenceId),
])

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
