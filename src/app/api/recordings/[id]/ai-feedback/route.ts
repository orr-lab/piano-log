import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAiFeedback } from "@/lib/gemini";
import { getSession } from "@/lib/session";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recording = await prisma.recording.findUnique({
    where: { id, userId: session.userId },
  });

  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { rating, feedback } = await generateAiFeedback(recording);

    const updated = await prisma.recording.update({
      where: { id, userId: session.userId },
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
