import { NextRequest } from "next/server";
import { verifyAdminToken } from "./auth";

export function requireAdmin(req: NextRequest): { sub: string; email: string } | null {
  const token = req.cookies.get("lf_admin_token")?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
