
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export function checkLocalAdmin(request: NextRequest) {
  if (process.env.ENABLE_LOCAL_ADMIN_API !== "true") {
    return NextResponse.json(
      { error: "Admin API deaktivdir." },
      { status: 403 }
    );
  }

  const expected = process.env.ADMIN_SETUP_TOKEN;
  const received = request.headers.get("x-admin-token");

  if (!expected || !received) {
    return NextResponse.json(
      { error: "İcazə verilmir." },
      { status: 401 }
    );
  }

  const a = Buffer.from(expected);
  const b = Buffer.from(received);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json(
      { error: "İcazə verilmir." },
      { status: 401 }
    );
  }

  return null;
}
