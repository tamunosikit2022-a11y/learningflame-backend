import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const stream = req.nextUrl.searchParams.get("stream"); // SCIENCE | ARTS | COMMERCIAL
  const state = req.nextUrl.searchParams.get("state");
  const currentClass = req.nextUrl.searchParams.get("class");

  const students = await prisma.student.findMany({
    where: {
      ...(stream ? { stream: stream as "SCIENCE" | "ARTS" | "COMMERCIAL" } : {}),
      ...(state ? { stateOfOrigin: { equals: state, mode: "insensitive" } } : {}),
      ...(currentClass ? { currentClass: { equals: currentClass, mode: "insensitive" } } : {}),
    },
    include: { attempts: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = students.map((s) => {
    const finished = s.attempts.filter((a) => a.status !== "IN_PROGRESS");
    const best = finished.length ? Math.max(...finished.map((a) => a.score ?? 0)) : null;
    return {
      examNumber: s.examNumber,
      fullName: s.fullName,
      stateOfOrigin: s.stateOfOrigin,
      age: s.age,
      currentClass: s.currentClass,
      stream: s.stream,
      subjects: [s.subjectOne, s.subjectTwo, s.subjectThree],
      attemptsUsed: finished.length,
      inProgress: s.attempts.some((a) => a.status === "IN_PROGRESS"),
      bestScore: best,
      attempts: s.attempts.map((a) => ({
        attemptNo: a.attemptNo,
        status: a.status,
        score: a.score,
        englishScore: a.englishScore,
        subjectOneScore: a.subjectOneScore,
        subjectTwoScore: a.subjectTwoScore,
        subjectThreeScore: a.subjectThreeScore,
      })),
    };
  });

  return NextResponse.json({ count: rows.length, students: rows });
}
