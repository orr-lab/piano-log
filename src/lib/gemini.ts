import { GoogleGenAI, Type } from "@google/genai";
import { downloadYoutubeAudio } from "@/lib/ytdlp";
import type { Recording } from "@/lib/types";

const MODEL = "gemini-3.6-flash";

function buildPrompt(title: string, composer: string): string {
  return `You are an experienced, demanding piano teacher giving a private lesson note on a
student's practice recording. This feedback is for the student's own improvement, not a public
review — prioritize honesty and specificity over encouragement. Do not soften real problems or
pad the response with generic praise ("great job!", "nice work!") that isn't backed by something
concrete you actually heard. If the take is rough, say so plainly and explain why.

The student has logged this recording as: "${title}"${composer ? ` by ${composer}` : ""}. Trust
this over your own guess if what you hear seems ambiguous (e.g. a mechanical/MIDI-precise
accompaniment pattern that could otherwise be misheard as a different genre or style) — but if
what you actually hear flatly contradicts this label (wrong piece entirely, or no piano audio at
all), say so instead of forcing the label to fit.

Listen to this performance and assess it, focusing only on musical qualities. Ignore visual
details like camera framing, lighting, or appearance — you're evaluating the playing, not the
video. Cover whichever of these are relevant to what you hear:
- Tempo and rhythmic steadiness — rushing, dragging, unstable stretches, tempo that drifts
- Dynamics and expressive control — flat/one-volume playing vs. real contrast and shaping
- Tone and touch — harsh or banged notes, uneven voicing, pedaling issues (blurring, missed
  pedal changes)
- Technical execution — wrong notes, fingering slips, hesitations, dropped or rushed passages
- Phrasing and musicality — does it shape phrases and breathe, or does it sound mechanical?
- If you can localize an issue in time (e.g. "around the middle," "in the final phrase," "at the
  faster passage"), do so — vague feedback is much less useful than specific feedback.

Respond with:
- rating: a whole number from 1 to 5 reflecting the overall execution quality of this specific
  take, judged against these concrete anchors — pick the one that best matches, don't hedge toward
  the middle:
  1 = breaks down repeatedly: stops/restarts, frequent wrong notes, barely holds the piece
      together.
  2 = plays through to the end, but rhythm is unstable for most of the piece, several technical
      slips, little to no dynamic shaping.
  3 = mostly steady tempo with only occasional slips, some real dynamic contrast, phrasing is
      recognizable but has rough edges.
  4 = solid technical control throughout with only minor, isolated slips; clear dynamics and
      shaping; sounds intentional, not accidental.
  5 = polished and performance-ready: secure technically and expressively, nothing to flag beyond
      nitpicks.
  Most bedroom-practice takes are NOT automatically a 2 — if the issues you hear are limited to one
  or two specific spots rather than pervasive, that's a 3 or 4, not a 2.
- feedback: as long as it needs to be to be genuinely useful — do not artificially shorten it.
  Structure it in two clearly separated parts: first what's actually working (be specific about
  what, not just that something was good), then what to work on next, with the most impactful
  issue first. Write it directly to the student, in a direct and honest tone — a demanding
  teacher's note, not a cheerleader's.`;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    rating: { type: Type.INTEGER },
    feedback: { type: Type.STRING },
  },
  required: ["rating", "feedback"],
};

export interface AiFeedbackResult {
  rating: number;
  feedback: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractFallbackRating(text: string): number {
  const outOfFive = text.match(/(\d)\s*\/\s*5/);
  if (outOfFive) return Number(outOfFive[1]);
  const labeled = text.match(/rating["\s:]+(\d)/i);
  if (labeled) return Number(labeled[1]);
  return 3;
}

interface UploadedMedia {
  fileUri: string;
  mimeType?: string;
  name: string;
}

async function uploadBlobToGemini(
  ai: GoogleGenAI,
  blob: Blob,
  mimeType: string
): Promise<UploadedMedia> {
  const uploaded = await ai.files.upload({ file: blob, config: { mimeType } });
  if (!uploaded.name) {
    throw new Error("Gemini did not return a file reference for the upload.");
  }

  let file = await ai.files.get({ name: uploaded.name });
  let attempts = 0;
  while (file.state === "PROCESSING" && attempts < 20) {
    await sleep(3000);
    file = await ai.files.get({ name: uploaded.name });
    attempts += 1;
  }
  if (file.state === "FAILED") {
    throw new Error("Gemini failed to process the uploaded file.");
  }
  if (file.state === "PROCESSING") {
    throw new Error("Gemini is still processing the file — try again in a moment.");
  }
  if (!file.uri) {
    throw new Error("Gemini did not return a URI for the processed file.");
  }

  return { fileUri: file.uri, mimeType: file.mimeType, name: uploaded.name };
}

export async function generateAiFeedback(
  recording: Pick<Recording, "videoSource" | "videoUrl" | "youtubeId" | "title" | "composer">
): Promise<AiFeedbackResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let mediaPart: { fileData: { fileUri: string; mimeType?: string } };
  let uploadedFileName: string | undefined;

  if (recording.videoSource === "YOUTUBE") {
    if (!recording.youtubeId) {
      throw new Error("This recording is missing its YouTube video ID.");
    }

    try {
      // Download the audio ourselves and upload it to Gemini directly, rather than relying
      // on Gemini to fetch the YouTube video — Gemini only recognizes videos Google's own
      // systems have already indexed, which can lag behind a recent/low-view upload by a day
      // or more.
      const { blob, mimeType } = await downloadYoutubeAudio(recording.youtubeId);
      const uploaded = await uploadBlobToGemini(ai, blob, mimeType);
      uploadedFileName = uploaded.name;
      mediaPart = { fileData: { fileUri: uploaded.fileUri, mimeType: uploaded.mimeType } };
    } catch (err) {
      console.error("[ai-feedback] yt-dlp download failed, falling back to direct URL:", err);
      // Fall back to handing Gemini the canonical URL directly — still works for videos
      // Google has already indexed, and keeps the feature working if yt-dlp can't reach
      // this video for some reason (blocked, unsupported format, binary unavailable, etc.).
      const canonicalUrl = `https://www.youtube.com/watch?v=${recording.youtubeId}`;
      mediaPart = { fileData: { fileUri: canonicalUrl, mimeType: "video/mp4" } };
    }
  } else {
    const res = await fetch(recording.videoUrl);
    if (!res.ok) {
      throw new Error("Could not fetch the video file for analysis.");
    }
    const mimeType = res.headers.get("content-type") ?? "video/mp4";
    const blob = await res.blob();

    const uploaded = await uploadBlobToGemini(ai, blob, mimeType);
    uploadedFileName = uploaded.name;
    mediaPart = { fileData: { fileUri: uploaded.fileUri, mimeType: uploaded.mimeType } };
  }

  try {
    let response;
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [mediaPart, { text: buildPrompt(recording.title, recording.composer) }],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (recording.videoSource === "YOUTUBE" && message.includes("PERMISSION_DENIED")) {
        throw new Error(
          "Gemini couldn't access this YouTube video. Very recently uploaded, unlisted, or " +
            "low-view videos aren't always indexed yet — this usually resolves within a day or " +
            "two. If it persists, try re-uploading the file directly instead."
        );
      }
      throw err;
    }

    const raw = response.text;
    if (!raw) {
      throw new Error("Gemini returned an empty response.");
    }

    let parsed: { rating?: unknown; feedback?: unknown } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fall through to the salvage path below.
    }

    const feedback = typeof parsed.feedback === "string" ? parsed.feedback.trim() : raw.trim();
    const rating =
      typeof parsed.rating === "number" ? parsed.rating : extractFallbackRating(raw);

    return {
      rating: Math.max(1, Math.min(5, Math.round(rating))),
      feedback,
    };
  } finally {
    if (uploadedFileName) {
      await ai.files.delete({ name: uploadedFileName }).catch(() => {});
    }
  }
}
