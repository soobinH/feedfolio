

import { pgTable, uuid, varchar, text, timestamp, integer } from "drizzle-orm/pg-core";


export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', {length: 100 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const resumes = pgTable('resumes', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const feedbacks = pgTable('feedbacks', {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id')
        .notNull()
        .references(() => resumes.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    tokensUsed: integer('tokens_used').default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type User = typeof users.$inferSelect;
export type Resume = typeof resumes.$inferSelect;
export type Feedback = typeof feedbacks.$inferSelect;