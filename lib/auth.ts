import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "";

if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  // Fail loudly at build/runtime rather than silently signing with an empty secret.
  throw new Error("JWT_SECRET env var is required in production");
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAdminToken(adminId: string, email: string): string {
  return jwt.sign({ sub: adminId, email, role: "admin" }, JWT_SECRET || "dev-secret", {
    expiresIn: "12h",
  });
}

export function verifyAdminToken(token: string): { sub: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET || "dev-secret") as { sub: string; email: string };
  } catch {
    return null;
  }
}
