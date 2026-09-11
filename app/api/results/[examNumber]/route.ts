import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resultsAndReviewOpen } from "@/lib/examWindow";

export async function GET(req: NextRequest, { params }: { params: { examNumber: string } }) {
  try {
    const pin = req.nextUrl.searchParams.get("pin");
    if (!pin) return NextResponse.json({ error: "PIN is required." }, { status: 400 });

    const student = await prisma.student.findUnique({
      where: { examNumber: params.examNumber },
      include: {
        attempts: {
          include: { answers: { include: { question: true } } },
          orderBy: { attemptNo: "asc" },
        },
      },
    });
    if (!student || student.pin !== pin) {
      return NextResponse.json({ error: "Invalid exam number or PIN." }, { status: 401 });
    }

    const reviewOpen = resultsAndReviewOpen();

    const attempts = student.attempts
      .filter((a) => a.status !== "IN_PROGRESS")
      .map((a) => ({
        attemptNo: a.attemptNo,
        status: a.status,
        submittedAt: a.submittedAt,
        score: reviewOpen ? a.score : null,
        englishScore: reviewOpen ? a.englishScore : null,
        subjectOneScore: reviewOpen ? a.subjectOneScore : null,
        subjectTwoScore: reviewOpen ? a.subjectTwoScore : null,
        subjectThreeScore: reviewOpen ? a.subjectThreeScore : null,
        review: reviewOpen
          ? a.answers.map((ans) => ({
              question: ans.question.text,
              options: {
                A: ans.question.optionA,
                B: ans.question.optionB,
                C: ans.question.optionC,
                D: ans.question.optionD,
              },
              chosen: ans.chosen,
              correctOption: ans.question.correctOption,
              explanation: ans.question.explanation,
            }))
          : null,
      }));

    return NextResponse.json({
      reviewOpen,
      resultsMessage: reviewOpen ? null : "Scores and answer review open at 6:10 PM.",
      bestScore: reviewOpen
        ? Math.max(...attempts.map((a) => a.score ?? 0), 0)
        : null,
      attempts,
    });
  } catch (err) {
    console.error("Results fetch error:", err);
    return NextResponse.json({ error: "Could not fetch results." }, { status: 500 });
  }
}
