import { prisma } from "./prisma";

export async function generateExamNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.student.count();
  const seq = (count + 1).toString().padStart(5, "0");
  const candidate = `LF-${year}-${seq}`;

  // Defensive check in case of a race condition between two simultaneous
  // registrations reading the same count.
  const exists = await prisma.student.findUnique({ where: { examNumber: candidate } });
  if (exists) {
    const bumped = (count + 1 + Math.floor(Math.random() * 1000)).toString().padStart(5, "0");
    return `LF-${year}-${bumped}`;
  }
  return candidate;
}
