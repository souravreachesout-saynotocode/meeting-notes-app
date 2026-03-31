import { NextResponse } from "next/server";
import { retryQueue } from "@/lib/retry-queue";

export async function GET() {
  return NextResponse.json(retryQueue.getStatus());
}
