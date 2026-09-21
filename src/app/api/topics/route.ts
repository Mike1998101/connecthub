import { NextResponse } from "next/server";
import { listTopics } from "@/lib/db";

export async function GET() {
  const topics = await listTopics();
  return NextResponse.json({ topics });
}
