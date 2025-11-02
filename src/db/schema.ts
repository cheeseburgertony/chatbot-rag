import {} from "drizzle-orm/gel-core";
import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const fileTable = pgTable("files", {
  id: serial("id").primaryKey(),
  file_name: varchar("file_name").notNull(),
  file_key: varchar("file_key").notNull(),
  records_ids: text("records_ids").array().notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export type FileModel = typeof fileTable.$inferInsert;
