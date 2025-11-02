import { getFiles } from "@/db";
import { NextResponse } from "next/server";

export const GET = async () => {
  const files = await getFiles();
  return NextResponse.json(files);
};
