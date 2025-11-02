import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { fileTable } from "./schema";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

export const insertFile = async (
  file_name: string,
  file_key: string,
  records_ids: string[]
) => {
  await db.insert(fileTable).values({
    file_name,
    file_key,
    records_ids,
  });
};

export const getFiles = async () => {
  return await db.select().from(fileTable);
};

export const deleteFileById = async (id: number) => {
  await db.delete(fileTable).where(eq(fileTable.id, id));
};

export const getFileById = async (id: number) => {
  const result = await db
    .select()
    .from(fileTable)
    .where(eq(fileTable.id, id))
    .limit(1);

  return result[0] || null;
};
