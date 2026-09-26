import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/running-version";

export function GET() {
  return NextResponse.json({ version: APP_VERSION });
}
