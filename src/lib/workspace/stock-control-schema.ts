import { z } from 'zod'
import { calendarDate } from './operations'
import { measureUnits } from './measurements'

export const recordId = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/)
export const stationSchema = z.object({
  id: recordId, name: z.string().trim().min(1).max(80), assignee: z.string().trim().max(100),
  targets: z.array(z.object({ recipeId: recordId, par: z.number().int().min(1).max(10000), onHand: z.number().int().min(0).max(10000).nullable(), countedOn: calendarDate.nullable() })).max(100),
}).refine(station => new Set(station.targets.map(target => target.recipeId)).size === station.targets.length, 'Choose each recipe once per station.')
export const stockControlSchema = z.object({ stations: z.array(stationSchema).max(30) }).refine(value => new Set(value.stations.map(station => station.id)).size === value.stations.length, 'Station IDs must be unique.')
export const countSubmissionSchema = z.object({
  eventId: recordId, revision: z.number().int().min(0), name: z.string().trim().min(1).max(120), date: calendarDate, phase: z.enum(['opening', 'closing', 'spot']),
  lines: z.array(z.object({ ingredientId: recordId, quantity: z.number().finite().min(0).max(1e9), unit: z.enum(measureUnits) })).min(1).max(500),
}).refine(value => new Set(value.lines.map(line => line.ingredientId)).size === value.lines.length, 'Count each ingredient once per session.')
export const countDraftSchema = z.object({
  version: z.literal(1), scope: z.string().min(1).max(300), eventId: recordId, revision: z.number().int().min(0),
  kitchenName: z.string().max(120), name: z.string().trim().min(1).max(120), date: calendarDate, phase: z.enum(['opening', 'closing', 'spot']),
  status: z.enum(['draft', 'queued', 'conflict']), updatedAt: z.iso.datetime(),
  lines: z.array(z.object({ ingredientId: recordId, name: z.string().max(120), baseUnit: z.enum(['g', 'ml', 'each']), packQuantity: z.number().nullable(), yieldPct: z.number(), densityGPerMl: z.number().nullable(), baseline: z.number().nullable(), quantity: z.number().finite().min(0).max(1e9).nullable(), unit: z.enum(measureUnits) })).min(1).max(500),
})
export type Station = z.infer<typeof stationSchema>
export type CountSubmission = z.infer<typeof countSubmissionSchema>
export type CountDraft = z.infer<typeof countDraftSchema>
