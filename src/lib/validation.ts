import { z } from "zod";

export const recordingInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  composer: z.string().trim().min(1, "Composer is required").max(200),
  recordedAt: z.string().min(1, "Date recorded is required"),
  videoSource: z.enum(["UPLOAD", "YOUTUBE"]),
  videoUrl: z.string().trim().min(1, "A video source is required"),
  youtubeId: z.string().trim().optional().nullable(),
  durationSec: z.number().int().positive().optional().nullable(),
  tags: z.array(z.string().trim().min(1)).default([]),
  difficulty: z.number().int().min(1).max(5),
  tempoBpm: z.number().int().positive().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  isFavorite: z.boolean().default(false),
});

export type RecordingInput = z.infer<typeof recordingInputSchema>;

export const recordingUpdateSchema = recordingInputSchema.partial();

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export const createUserSchema = z.object({
  label: z.string().trim().min(1, "Give this account a name").max(100),
  password: z.string().min(1, "Password is required"),
});

export const setPasswordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(1, "New password is required"),
});
