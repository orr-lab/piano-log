import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { recordingUpdateSchema } from "@/lib/validation";
import { getSession } from "@/lib/session";

export async function GET(
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
  return NextResponse.json(recording);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = recordingUpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { recordedAt, ...rest } = parsed.data;

  try {
    const recording = await prisma.recording.update({
      where: { id, userId: session.userId },
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
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const recording = await prisma.recording.findUnique({
    where: { id, userId: session.userId },
  });

  if (!recording) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (recording.videoSource === "UPLOAD" && recording.videoUrl) {
    await del(recording.videoUrl).catch(() => {});
  }

  try {
    await prisma.recording.delete({ where: { id, userId: session.userId } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
