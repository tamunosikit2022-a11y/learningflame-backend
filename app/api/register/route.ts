import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateExamNumber } from "@/lib/examId";
import { isValidSubjectChoice, Stream } from "@/lib/examConfig";

function randomPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, stateOfOrigin, age, currentClass, stream, subjects } = body as {
      fullName?: string;
      stateOfOrigin?: string;
      age?: number;
      currentClass?: string;
      stream?: Stream;
      subjects?: string[];
    };

    if (!fullName || !stateOfOrigin || !age || !currentClass || !stream || !subjects) {
      return NextResponse.json({ error: "All registration fields are required." }, { status: 400 });
    }

    if (!["SCIENCE", "ARTS", "COMMERCIAL"].includes(stream)) {
      return NextResponse.json({ error: "Invalid stream." }, { status: 400 });
    }

    if (!isValidSubjectChoice(stream, subjects)) {
      return NextResponse.json(
        { error: "Subject choices must be 3 distinct subjects from your chosen stream's pool." },
        { status: 400 }
      );
    }

    if (typeof age !== "number" || age < 10 || age > 60) {
      return NextResponse.json({ error: "Enter a valid age." }, { status: 400 });
    }

    const examNumber = await generateExamNumber();
    const pin = randomPin();

    const student = await prisma.student.create({
      data: {
        examNumber,
        fullName: fullName.trim(),
        stateOfOrigin: stateOfOrigin.trim(),
        age,
        currentClass: currentClass.trim(),
        stream,
        subjectOne: subjects[0],
        subjectTwo: subjects[1],
        subjectThree: subjects[2],
        pin,
      },
    });

    return NextResponse.json({
      examNumber: student.examNumber,
      pin, // shown once at registration — student must save it
    });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
