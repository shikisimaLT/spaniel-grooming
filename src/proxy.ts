import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only the back office needs a session; the public landing page at "/" is never touched.
export const config = {
  matcher: ["/back-office", "/back-office/:path*"],
};
