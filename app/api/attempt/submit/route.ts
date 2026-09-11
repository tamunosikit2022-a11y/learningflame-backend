import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPULSORY_SUBJECT, MARKS_PER_SUBJECT, QUESTIONS_ENGLISH, QUESTIONS_PER_SUBJECT } from "@/lib/examConfig";

export async function POST(req: NextRequest) {
  try {
    const { attemptId, autoSubmitted } = (await req.json()) as {
      attemptId?: string;
      autoSubmitted?: boolean;
    };
    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required." }, { status: 400 });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        student: true,
        answers: { include: { question: { include: { subject: true } } } },
      },
    });
    if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Attempt already finalized." }, { status: 409 });
    }

    const { subjectOne, subjectTwo, subjectThree } = attempt.student;

    let englishCorrect = 0;
    let oneCorrect = 0;
    let twoCorrect = 0;
    let threeCorrect = 0;

    for (const ans of attempt.answers) {
      const isCorrect = ans.chosen !== null && ans.chosen === ans.question.correctOption;
      if (!isCorrect) continue;
      const subjName = ans.question.subject.name;
      if (subjName === COMPULSORY_SUBJECT) englishCorrect++;
      else if (subjName === subjectOne) oneCorrect++;
      else if (subjName === subjectTwo) twoCorrect++;
      else if (subjName === subjectThree) threeCorrect++;
    }

    const englishScore = Math.round((englishCorrect / QUESTIONS_ENGLISH) * MARKS_PER_SUBJECT);
    const oneScore = Math.round((oneCorrect / QUESTIONS_PER_SUBJECT) * MARKS_PER_SUBJECT);
    const twoScore = Math.round((twoCorrect / QUESTIONS_PER_SUBJECT) * MARKS_PER_SUBJECT);
    const threeScore = Math.round((threeCorrect / QUESTIONS_PER_SUBJECT) * MARKS_PER_SUBJECT);
    const total = englishScore + oneScore + twoScore + threeScore;

    const updated = await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: autoSubmitted ? "AUTO_SUBMITTED" : "SUBMITTED",
        submittedAt: new Date(),
        englishScore,
        subjectOneScore: oneScore,
        subjectTwoScore: twoScore,
        subjectThreeScore: threeScore,
        score: total,
      },
    });

    return NextResponse.json({
      submitted: true,
      score: updated.score,
      note: "Your detailed score and answer review become visible at 6:10 PM.",
    });
  } catch (err) {
    console.error("Attempt submit error:", err);
    return NextResponse.json({ error: "Could not submit attempt." }, { status: 500 });
  }
}
