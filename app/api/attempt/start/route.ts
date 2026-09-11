import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPULSORY_SUBJECT, MAX_ATTEMPTS, QUESTIONS_ENGLISH, QUESTIONS_PER_SUBJECT } from "@/lib/examConfig";
import { canStartNewAttempt, computeDeadline } from "@/lib/examWindow";

async function pickRandomQuestions(subjectName: string, count: number) {
  const subject = await prisma.subject.findUnique({ where: { name: subjectName } });
  if (!subject) return [];
  // Postgres random sampling; fine at this question-bank scale.
  const questions = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Question" WHERE "subjectId" = $1 ORDER BY random() LIMIT $2`,
    subject.id,
    count
  );
  return questions;
}

export async function POST(req: NextRequest) {
  try {
    const { examNumber, pin } = (await req.json()) as { examNumber?: string; pin?: string };
    if (!examNumber || !pin) {
      return NextResponse.json({ error: "Exam number and PIN are required." }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { examNumber },
      include: { attempts: true },
    });
    if (!student || student.pin !== pin) {
      return NextResponse.json({ error: "Invalid exam number or PIN." }, { status: 401 });
    }

    // Resume an in-progress attempt if one exists and hasn't passed its deadline.
    const inProgress = student.attempts.find((a) => a.status === "IN_PROGRESS");
    if (inProgress) {
      if (new Date() > inProgress.deadlineAt) {
        await prisma.attempt.update({
          where: { id: inProgress.id },
          data: { status: "AUTO_SUBMITTED", submittedAt: new Date() },
        });
      } else {
        const answers = await prisma.answer.findMany({
          where: { attemptId: inProgress.id },
          include: { question: true },
        });
        return NextResponse.json({
          resumed: true,
          attemptId: inProgress.id,
          deadlineAt: inProgress.deadlineAt,
          questions: answers.map((a) => ({
            id: a.question.id,
            subject: a.question.subjectId,
            text: a.question.text,
            optionA: a.question.optionA,
            optionB: a.question.optionB,
            optionC: a.question.optionC,
            optionD: a.question.optionD,
            chosen: a.chosen,
          })),
        });
      }
    }

    const attemptsUsed = student.attempts.filter((a) => a.status !== "IN_PROGRESS").length;
    if (attemptsUsed >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_ATTEMPTS} attempts already used for this stream.` },
        { status: 403 }
      );
    }

    if (!canStartNewAttempt()) {
      return NextResponse.json(
        { error: "The examination is only open for new starts between 12:00 PM and 6:00 PM." },
        { status: 403 }
      );
    }

    const startedAt = new Date();
    const deadlineAt = computeDeadline(startedAt);

    const englishQs = await pickRandomQuestions(COMPULSORY_SUBJECT, QUESTIONS_ENGLISH);
    const subjectOneQs = await pickRandomQuestions(student.subjectOne, QUESTIONS_PER_SUBJECT);
    const subjectTwoQs = await pickRandomQuestions(student.subjectTwo, QUESTIONS_PER_SUBJECT);
    const subjectThreeQs = await pickRandomQuestions(student.subjectThree, QUESTIONS_PER_SUBJECT);

    const allQuestionIds = [...englishQs, ...subjectOneQs, ...subjectTwoQs, ...subjectThreeQs].map(
      (q) => q.id
    );

    if (allQuestionIds.length < QUESTIONS_ENGLISH + QUESTIONS_PER_SUBJECT * 3) {
      return NextResponse.json(
        { error: "Question bank is incomplete for one of your subjects. Contact an administrator." },
        { status: 500 }
      );
    }

    const attempt = await prisma.attempt.create({
      data: {
        studentId: student.id,
        attemptNo: attemptsUsed + 1,
        startedAt,
        deadlineAt,
        answers: {
          create: allQuestionIds.map((questionId) => ({ questionId })),
        },
      },
    });

    const fullQuestions = await prisma.question.findMany({
      where: { id: { in: allQuestionIds } },
    });
    // Preserve the randomized order we picked, not DB insertion order.
    const orderMap = new Map(allQuestionIds.map((id, idx) => [id, idx]));
    fullQuestions.sort((a, b) => (orderMap.get(a.id)! - orderMap.get(b.id)!));

    return NextResponse.json({
      resumed: false,
      attemptId: attempt.id,
      deadlineAt,
      questions: fullQuestions.map((q) => ({
        id: q.id,
        subject: q.subjectId,
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
      })),
    });
  } catch (err) {
    console.error("Attempt start error:", err);
    return NextResponse.json({ error: "Could not start attempt. Please try again." }, { status: 500 });
  }
}
