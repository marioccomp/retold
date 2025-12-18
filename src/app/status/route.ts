import { NextRequest, NextResponse } from "next/server";
import database from "@/src/infra/database";

export async function GET(request: NextRequest) {
  const result = await database.query("SELECT 1 + 1 as sum;");
  console.log(result.rows[0]);

  return NextResponse.json({
    updated_at: new Date().toISOString(),
  });
}
