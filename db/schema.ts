import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['author','reviewer','editor'] }).notNull().default('author'),
  createdAt: integer('created_at').notNull(),
}, t => [uniqueIndex('users_email').on(t.email)]);
export const invitations = sqliteTable('invitations', {
  email: text('email').primaryKey(),
  role: text('role', { enum: ['reviewer','editor'] }).notNull(),
  createdAt: integer('created_at').notNull(),
});
export const submissions = sqliteTable('submissions', {
  id: text('id').primaryKey(), authorId: text('author_id').notNull().references(() => users.id),
  title: text('title').notNull(), abstract: text('abstract').notNull(), keywords: text('keywords').notNull(),
  authors: text('authors').notNull(), track: text('track').notNull(),
  stream: text('stream', { enum: ['conference','journal'] }).notNull().default('conference'),
  status: text('status', { enum: ['draft','submitted','under_review','revision_requested','accepted','rejected'] }).notNull().default('draft'),
  fileKey: text('file_key'), fileName: text('file_name'), fileType: text('file_type'),
  decisionNote: text('decision_note'), publishedAt: integer('published_at'), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(), submittedAt: integer('submitted_at'),
}, t => [index('submissions_author').on(t.authorId), index('submissions_status').on(t.status)]);
export const assignments = sqliteTable('assignments', {
  id: text('id').primaryKey(), submissionId: text('submission_id').notNull().references(() => submissions.id),
  reviewerId: text('reviewer_id').notNull().references(() => users.id),
  status: text('status', { enum: ['assigned','completed'] }).notNull().default('assigned'),
  score: integer('score'), recommendation: text('recommendation'), comments: text('comments'), confidential: text('confidential'),
  conflict: integer('conflict').notNull().default(0), createdAt: integer('created_at').notNull(), completedAt: integer('completed_at'),
}, t => [uniqueIndex('assignment_pair').on(t.submissionId,t.reviewerId), index('assignments_reviewer').on(t.reviewerId)]);
export const events = sqliteTable('events', {
  id: text('id').primaryKey(), submissionId: text('submission_id').notNull().references(() => submissions.id),
  actorId: text('actor_id').notNull(), action: text('action').notNull(), at: integer('at').notNull(),
}, t => [index('events_submission').on(t.submissionId)]);
