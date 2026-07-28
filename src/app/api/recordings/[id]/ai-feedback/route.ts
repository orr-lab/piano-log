import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAiFeedback } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recording = await prisma.recording.findUnique({ where: { id } });

  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { rating, feedback } = await generateAiFeedback(recording);

    const updated = await prisma.recording.update({
      where: { id },
      data: {
        aiRating: rating,
        aiFeedback: feedback,
        aiFeedbackAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't generate feedback." },
      { status: 502 }
    );
  }
}
