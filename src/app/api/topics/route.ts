import { NextResponse } from "next/server";
import { getState } from "@/lib/store";

export async function GET() {
  const s = getState();
  return NextResponse.json({ topics: s.topics });
}
