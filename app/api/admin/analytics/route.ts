import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: NextRequest) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const totalStudents = await prisma.student.count();
  const finishedAttempts = await prisma.attempt.findMany({
    where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
    include: { student: true },
  });

  const byStream: Record<string, { count: number; totalScore: number }> = {
    SCIENCE: { count: 0, totalScore: 0 },
    ARTS: { count: 0, totalScore: 0 },
    COMMERCIAL: { count: 0, totalScore: 0 },
  };
  let highest = 0;
  let sumScores = 0;

  for (const a of finishedAttempts) {
    const stream = a.student.stream;
    byStream[stream].count++;
    byStream[stream].totalScore += a.score ?? 0;
    sumScores += a.score ?? 0;
    if ((a.score ?? 0) > highest) highest = a.score ?? 0;
  }

  const averageScore = finishedAttempts.length ? sumScores / finishedAttempts.length : 0;
  const inProgressCount = await prisma.attempt.count({ where: { status: "IN_PROGRESS" } });
  const completionRate = totalStudents ? finishedAttempts.length / (totalStudents * 2) : 0;

  // Hardest questions: lowest correct-rate among questions that were answered at all.
  const answers = await prisma.answer.findMany({
    where: { attempt: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } } },
    include: { question: { include: { subject: true } } },
  });
  const perQuestion: Record<string, { text: string; subject: string; correct: number; total: number }> = {};
  for (const ans of answers) {
    const q = ans.question;
    if (!perQuestion[q.id]) {
      perQuestion[q.id] = { text: q.text, subject: q.subject.name, correct: 0, total: 0 };
    }
    perQuestion[q.id].total++;
    if (ans.chosen === q.correctOption) perQuestion[q.id].correct++;
  }
  const hardestQuestions = Object.values(perQuestion)
    .filter((q) => q.total >= 5) // enough sample size to be meaningful
    .map((q) => ({ ...q, correctRate: q.correct / q.total }))
    .sort((a, b) => a.correctRate - b.correctRate)
    .slice(0, 15);

  return NextResponse.json({
    totalStudents,
    attemptsSubmitted: finishedAttempts.length,
    attemptsInProgress: inProgressCount,
    averageScore: Math.round(averageScore * 10) / 10,
    highestScore: highest,
    completionRate: Math.round(completionRate * 1000) / 10, // percent, 1dp
    byStream: Object.fromEntries(
      Object.entries(byStream).map(([k, v]) => [
        k,
        { attempts: v.count, averageScore: v.count ? Math.round((v.totalScore / v.count) * 10) / 10 : 0 },
      ])
    ),
    hardestQuestions,
  });
}
