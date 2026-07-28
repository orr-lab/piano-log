import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { recordingUpdateSchema } from "@/lib/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recording = await prisma.recording.findUnique({ where: { id } });
  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(recording);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = recordingUpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { recordedAt, ...rest } = parsed.data;

  try {
    const recording = await prisma.recording.update({
      where: { id },
      data: {
        ...rest,
        ...(recordedAt ? { recordedAt: new Date(recordedAt) } : {}),
      },
    });
    return NextResponse.json(recording);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const recording = await prisma.recording.findUnique({ where: { id } });

  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (recording.videoSource === "UPLOAD" && recording.videoUrl) {
    await del(recording.videoUrl).catch(() => {});
  }

  await prisma.recording.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
