import { z } from 'zod';
export declare const entityIdSchema: z.ZodString;
export declare const tagSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, z.core.$strip>;
export declare const categorySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    color: z.ZodString;
}, z.core.$strip>;
export declare const documentSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    category: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
    }, z.core.$strip>>;
    tags: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, z.core.$strip>>;
    currentVersion: z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        originalFilename: z.ZodString;
        mimeType: z.ZodString;
        fileSize: z.ZodNumber;
        importedAt: z.ZodString;
    }, z.core.$strip>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const createNoteSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    category: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const updateNoteSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodDefault<z.ZodNullable<z.ZodString>>>;
    tags: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString>>>;
}, z.core.$strip>;
export declare const noteSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    content: z.ZodString;
    category: z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        color: z.ZodString;
    }, z.core.$strip>>;
    tags: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, z.core.$strip>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const importDocumentFieldsSchema: z.ZodObject<{
    title: z.ZodString;
    category: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    version: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const searchResultSchema: z.ZodObject<{
    entityType: z.ZodEnum<{
        document: "document";
        integration: "integration";
        note: "note";
    }>;
    entityId: z.ZodString;
    title: z.ZodString;
    snippet: z.ZodString;
    rank: z.ZodNumber;
    category: z.ZodNullable<z.ZodString>;
    tags: z.ZodArray<z.ZodString>;
    version: z.ZodNullable<z.ZodString>;
    mimeType: z.ZodNullable<z.ZodString>;
    integrationFolderId: z.ZodNullable<z.ZodString>;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const searchResponseSchema: z.ZodObject<{
    query: z.ZodString;
    results: z.ZodArray<z.ZodObject<{
        entityType: z.ZodEnum<{
            document: "document";
            integration: "integration";
            note: "note";
        }>;
        entityId: z.ZodString;
        title: z.ZodString;
        snippet: z.ZodString;
        rank: z.ZodNumber;
        category: z.ZodNullable<z.ZodString>;
        tags: z.ZodArray<z.ZodString>;
        version: z.ZodNullable<z.ZodString>;
        mimeType: z.ZodNullable<z.ZodString>;
        integrationFolderId: z.ZodNullable<z.ZodString>;
        updatedAt: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const extractiveAnswerSourceSchema: z.ZodObject<{
    entityType: z.ZodEnum<{
        document: "document";
        integration: "integration";
        note: "note";
    }>;
    entityId: z.ZodString;
    title: z.ZodString;
    excerpt: z.ZodString;
    category: z.ZodNullable<z.ZodString>;
    mimeType: z.ZodNullable<z.ZodString>;
    integrationFolderId: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export declare const extractiveAnswerResponseSchema: z.ZodObject<{
    question: z.ZodString;
    answer: z.ZodNullable<z.ZodString>;
    sources: z.ZodArray<z.ZodObject<{
        entityType: z.ZodEnum<{
            document: "document";
            integration: "integration";
            note: "note";
        }>;
        entityId: z.ZodString;
        title: z.ZodString;
        excerpt: z.ZodString;
        category: z.ZodNullable<z.ZodString>;
        mimeType: z.ZodNullable<z.ZodString>;
        integrationFolderId: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const integrationSpaceSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const createIntegrationSpaceSchema: z.ZodObject<{
    name: z.ZodString;
}, z.core.$strip>;
export declare const updateIntegrationSpaceSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const integrationFolderSchema: z.ZodObject<{
    id: z.ZodString;
    spaceId: z.ZodString;
    name: z.ZodString;
    parentId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const integrationEntrySchema: z.ZodObject<{
    id: z.ZodString;
    folderId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    url: z.ZodNullable<z.ZodString>;
    attachment: z.ZodNullable<z.ZodObject<{
        originalFilename: z.ZodString;
        mimeType: z.ZodString;
        fileSize: z.ZodNumber;
    }, z.core.$strip>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const createIntegrationFolderSchema: z.ZodObject<{
    name: z.ZodString;
    spaceId: z.ZodString;
    parentId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const updateIntegrationFolderSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const createIntegrationEntrySchema: z.ZodObject<{
    folderId: z.ZodString;
    title: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    url: z.ZodPipe<z.ZodDefault<z.ZodUnion<readonly [z.ZodURL, z.ZodLiteral<"">, z.ZodNull]>>, z.ZodTransform<string | null, string | null>>;
}, z.core.$strip>;
export declare const updateIntegrationEntrySchema: z.ZodObject<{
    folderId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    url: z.ZodPipe<z.ZodOptional<z.ZodUnion<readonly [z.ZodURL, z.ZodLiteral<"">, z.ZodNull]>>, z.ZodTransform<string | null | undefined, string | null | undefined>>;
}, z.core.$strip>;
export declare const taskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    dueAt: z.ZodNullable<z.ZodString>;
    completedAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const createTaskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    dueAt: z.ZodDefault<z.ZodNullable<z.ZodISODateTime>>;
}, z.core.$strip>;
export declare const updateTaskSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    dueAt: z.ZodOptional<z.ZodNullable<z.ZodISODateTime>>;
    completed: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const vaultEntrySchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
    url: z.ZodString;
    notes: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const createVaultEntrySchema: z.ZodObject<{
    label: z.ZodString;
    username: z.ZodDefault<z.ZodString>;
    password: z.ZodString;
    url: z.ZodDefault<z.ZodString>;
    notes: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const updateVaultEntrySchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    password: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    notes: z.ZodOptional<z.ZodDefault<z.ZodString>>;
}, z.core.$strip>;
export declare const vaultPasswordSchema: z.ZodObject<{
    password: z.ZodString;
}, z.core.$strip>;
export declare const userProfileSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodUnion<readonly [z.ZodEmail, z.ZodLiteral<"">]>;
    role: z.ZodString;
    bio: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const updateUserProfileSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodUnion<readonly [z.ZodEmail, z.ZodLiteral<"">]>;
    role: z.ZodString;
    bio: z.ZodString;
}, z.core.$strip>;
export type Tag = z.infer<typeof tagSchema>;
export type Category = z.infer<typeof categorySchema>;
export type DocumentRecord = z.infer<typeof documentSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type Note = z.infer<typeof noteSchema>;
export type ImportDocumentFields = z.infer<typeof importDocumentFieldsSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type ExtractiveAnswerSource = z.infer<typeof extractiveAnswerSourceSchema>;
export type ExtractiveAnswerResponse = z.infer<typeof extractiveAnswerResponseSchema>;
export type IntegrationSpace = z.infer<typeof integrationSpaceSchema>;
export type CreateIntegrationSpaceInput = z.infer<typeof createIntegrationSpaceSchema>;
export type UpdateIntegrationSpaceInput = z.infer<typeof updateIntegrationSpaceSchema>;
export type IntegrationFolder = z.infer<typeof integrationFolderSchema>;
export type IntegrationEntry = z.infer<typeof integrationEntrySchema>;
export type CreateIntegrationFolderInput = z.infer<typeof createIntegrationFolderSchema>;
export type CreateIntegrationEntryInput = z.infer<typeof createIntegrationEntrySchema>;
export type UpdateIntegrationFolderInput = z.infer<typeof updateIntegrationFolderSchema>;
export type UpdateIntegrationEntryInput = z.infer<typeof updateIntegrationEntrySchema>;
export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type VaultEntry = z.infer<typeof vaultEntrySchema>;
export type CreateVaultEntryInput = z.infer<typeof createVaultEntrySchema>;
export type UpdateVaultEntryInput = z.infer<typeof updateVaultEntrySchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
//# sourceMappingURL=index.d.ts.map