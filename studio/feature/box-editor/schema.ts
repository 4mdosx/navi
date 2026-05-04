import { z } from 'zod'

const boxKindSchema = z.enum(['box', 'thing', 'storage', 'link'])

export const boxNodeSchema = z.object({
  id: z.string().min(1),
  layerId: z.string().min(1),
  label: z.string(),
  parentId: z.string().min(1).nullable(),
  type: boxKindSchema.default('box'),
  linkTargetLayerId: z.string().min(1).nullable().default(null),
  x: z.number().int(),
  y: z.number().int(),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
})

export const layerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  order: z.number().int(),
})

export const boxEditorDocumentSchema = z.object({
  version: z.literal(1),
  layers: z.array(layerSchema).min(1),
  boxes: z.record(z.string(), boxNodeSchema),
})

export type BoxEditorDocumentParsed = z.infer<typeof boxEditorDocumentSchema>

export function parseDocument(json: string): BoxEditorDocumentParsed {
  const raw = JSON.parse(json) as unknown
  return boxEditorDocumentSchema.parse(raw)
}

export function serializeDocument(doc: BoxEditorDocumentParsed): string {
  return JSON.stringify(doc, null, 2)
}
