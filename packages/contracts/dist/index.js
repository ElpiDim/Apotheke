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
    entityType: z.enum(['document', 'note', 'integration']),
    entityId: entityIdSchema,
    title: z.string(),
    snippet: z.string(),
    rank: z.number(),
    category: z.string().nullable(),
    tags: z.array(z.string()),
    version: z.string().nullable(),
    mimeType: z.string().nullable(),
    integrationFolderId: entityIdSchema.nullable(),
    updatedAt: z.string(),
});
export const searchResponseSchema = z.object({
    query: z.string(),
    results: z.array(searchResultSchema),
});
export const extractiveAnswerSourceSchema = z.object({
    entityType: z.enum(['document', 'note', 'integration']),
    entityId: entityIdSchema,
    title: z.string(),
    excerpt: z.string(),
    category: z.string().nullable(),
    mimeType: z.string().nullable(),
    integrationFolderId: entityIdSchema.nullable(),
});
export const extractiveAnswerResponseSchema = z.object({
    question: z.string(),
    answer: z.string().nullable(),
    sources: z.array(extractiveAnswerSourceSchema),
});
export const integrationSpaceSchema = z.object({
    id: entityIdSchema,
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const createIntegrationSpaceSchema = z.object({
    name: z.string().trim().min(1).max(80),
});
export const updateIntegrationSpaceSchema = createIntegrationSpaceSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one section field is required.');
export const integrationFolderSchema = z.object({
    id: entityIdSchema,
    spaceId: entityIdSchema,
    name: z.string(),
    parentId: entityIdSchema.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const integrationEntrySchema = z.object({
    id: entityIdSchema,
    folderId: entityIdSchema,
    title: z.string(),
    description: z.string(),
    url: z.string().nullable(),
    attachment: z.object({
        originalFilename: z.string(),
        mimeType: z.string(),
        fileSize: z.number().int().nonnegative(),
    }).nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const createIntegrationFolderSchema = z.object({
    name: z.string().trim().min(1).max(120),
    spaceId: entityIdSchema,
    parentId: entityIdSchema.nullable().default(null),
});
export const updateIntegrationFolderSchema = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    parentId: entityIdSchema.nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one folder field is required.');
export const createIntegrationEntrySchema = z.object({
    folderId: entityIdSchema,
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().max(20_000).default(''),
    url: z.union([z.url(), z.literal(''), z.null()]).default(null)
        .transform((value) => value || null),
});
export const updateIntegrationEntrySchema = z.object({
    folderId: entityIdSchema.optional(),
    title: z.string().trim().min(1).max(240).optional(),
    description: z.string().trim().max(20_000).optional(),
    url: z.union([z.url(), z.literal(''), z.null()]).optional()
        .transform((value) => value === '' ? null : value),
}).refine((value) => Object.keys(value).length > 0, 'At least one integration field is required.');
export const taskSchema = z.object({
    id: entityIdSchema,
    title: z.string(),
    description: z.string(),
    dueAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const createTaskSchema = z.object({
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().max(20_000).default(''),
    dueAt: z.iso.datetime({ offset: true }).nullable().default(null),
});
export const updateTaskSchema = z.object({
    title: z.string().trim().min(1).max(240).optional(),
    description: z.string().trim().max(20_000).optional(),
    dueAt: z.iso.datetime({ offset: true }).nullable().optional(),
    completed: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one task field is required.');
//# sourceMappingURL=index.js.map