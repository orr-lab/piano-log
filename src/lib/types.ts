export type VideoSource = "UPLOAD" | "YOUTUBE";

export interface Recording {
  id: string;
  title: string;
  composer: string;
  recordedAt: string;
  videoSource: VideoSource;
  videoUrl: string;
  youtubeId: string | null;
  durationSec: number | null;
  tags: string[];
  difficulty: number;
  tempoBpm: number | null;
  notes: string | null;
  isFavorite: boolean;
  aiRating: number | null;
  aiFeedback: string | null;
  aiFeedbackAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function pieceKey(recording: Pick<Recording, "title" | "composer">): string {
  return `${recording.title.trim().toLowerCase()}::${recording.composer.trim().toLowerCase()}`;
}
