import {sqliteTable,text,integer,primaryKey,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{kind:text('kind').notNull(),id:text('id').notNull(),payload:text('payload').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.kind,t.id]})]);
export const drafts=sqliteTable('drafts',{kind:text('kind').notNull(),id:text('id').notNull(),payload:text('payload').notNull(),baseVersion:integer('base_version').notNull(),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.kind,t.id]})]);
export const feedback=sqliteTable('feedback',{id:text('id').primaryKey(),target:text('target').notNull(),type:text('type').notNull(),message:text('message').notNull(),status:text('status').notNull().default('pending'),createdAt:text('created_at').notNull()},t=>[index('feedback_status_created').on(t.status,t.createdAt)]);
export const auditLog=sqliteTable('audit_log',{id:text('id').primaryKey(),actor:text('actor').notNull(),kind:text('kind').notNull(),target:text('target').notNull(),action:text('action').notNull(),before:text('before'),after:text('after'),createdAt:text('created_at').notNull()},t=>[index('audit_target_time').on(t.target,t.createdAt)]);
export const rateLimits=sqliteTable('rate_limits',{key:text('key').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});
// Community confirmations of collection and donation points (2026-10). One vote per device, point and Vietnam day;
// the device id is a random id kept on the phone and stored here only as a SHA-256 hash. Votes keep no coordinates.
export const pointVotes = sqliteTable(
  'point_votes',
  {
    id: text('id').primaryKey(),
    targetKind: text('target_kind').notNull(),
    targetId: text('target_id').notNull(),
    deviceHash: text('device_hash').notNull(),
    vote: text('vote').notNull(),
    day: text('day').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('point_votes_device_day').on(t.targetKind, t.targetId, t.deviceHash, t.day),
    index('point_votes_target_time').on(t.targetKind, t.targetId, t.createdAt),
  ],
);
