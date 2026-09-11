import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { attemptId, questionId, chosen } = (await req.json()) as {
      attemptId?: string;
      questionId?: string;
      chosen?: "A" | "B" | "C" | "D" | null;
    };

    if (!attemptId || !questionId) {
      return NextResponse.json({ error: "attemptId and questionId are required." }, { status: 400 });
    }

    const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "This attempt is no longer active." }, { status: 409 });
    }
    if (new Date() > attempt.deadlineAt) {
      return NextResponse.json({ error: "Time is up for this attempt." }, { status: 409 });
    }

    await prisma.answer.update({
      where: { attemptId_questionId: { attemptId, questionId } },
      data: { chosen: chosen ?? null },
    });

    return NextResponse.json({ saved: true });
  } catch (err) {
    console.error("Answer save error:", err);
    return NextResponse.json({ error: "Could not save answer." }, { status: 500 });
  }
}
