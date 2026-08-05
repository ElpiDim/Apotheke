import { z } from 'zod';
export const entityIdSchema = z.string().uuid();
export const tagSchema = z.object({
    id: entityIdSchema,
    name: z.string(),
});
export const categorySchema = z.object({
    id: entityIdSchema,
    name: z.string(),
    color: z.string(),
});
export const documentSchema = z.object({
    id: entityIdSchema,
    title: z.string(),
    category: categorySchema.nullable(),
    tags: z.array(tagSchema),
    currentVersion: z.object({
        id: entityIdSchema,
        label: z.string(),
        originalFilename: z.string(),
        mimeType: z.string(),
        fileSize: z.number().int().nonnegative(),
        importedAt: z.string(),
    }),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const createNoteSchema = z.object({
    title: z.string().trim().min(1).max(240),
    content: z.string().max(2_000_000),
    category: z.string().trim().max(120).nullable().default(null),
    tags: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
});
export const updateNoteSchema = createNoteSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one note field is required.');
export const noteSchema = z.object({
    id: entityIdSchema,
    title: z.string(),
    content: z.string(),
    category: categorySchema.nullable(),
    tags: z.array(tagSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const importDocumentFieldsSchema = z.object({
    title: z.string().trim().min(1).max(240),
    category: z.string().trim().max(120).nullable().default(null),
    tags: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
    version: z.string().trim().min(1).max(40).default('1.0'),
});
export const searchResultSchema = z.object({
    entityType: z.enum(['document', 'note']),
    entityId: entityIdSchema,
    title: z.string(),
    snippet: z.string(),
    rank: z.number(),
    category: z.string().nullable(),
    tags: z.array(z.string()),
    version: z.string().nullable(),
    updatedAt: z.string(),
});
export const searchResponseSchema = z.object({
    query: z.string(),
    results: z.array(searchResultSchema),
});
//# sourceMappingURL=index.js.map