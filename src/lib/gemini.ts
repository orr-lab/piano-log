import { GoogleGenAI, Type } from "@google/genai";
import type { Recording } from "@/lib/types";

const MODEL = "gemini-3.6-flash";

const PROMPT = `You are an encouraging piano teacher reviewing a student's practice recording.
Listen to this performance and assess it, focusing on musical qualities: tempo and rhythmic
steadiness, dynamic range and control, tone/touch, and any obvious mistakes or hesitations.
Ignore visual details like camera framing, lighting, or appearance — you're evaluating the
playing, not the video.

Respond with:
- rating: a whole number from 1 to 5 (5 = polished and performance-ready, 1 = very rough take)
  reflecting the overall execution quality of this specific take.
- feedback: 2-4 sentences of specific, constructive feedback — what went well, and one or two
  concrete things to work on next. Be warm and encouraging, but honest and specific. Avoid
  generic praise like "great job!" with nothing concrete behind it.`;

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

export async function generateAiFeedback(
  recording: Pick<Recording, "videoSource" | "videoUrl" | "youtubeId">
): Promise<AiFeedbackResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let videoPart: { fileData: { fileUri: string; mimeType?: string } };
  let uploadedFileName: string | undefined;

  if (recording.videoSource === "YOUTUBE") {
    if (!recording.youtubeId) {
      throw new Error("This recording is missing its YouTube video ID.");
    }
    // Gemini only recognizes canonical youtube.com/watch URLs, not youtu.be short links.
    const canonicalUrl = `https://www.youtube.com/watch?v=${recording.youtubeId}`;
    videoPart = { fileData: { fileUri: canonicalUrl, mimeType: "video/mp4" } };
  } else {
    const res = await fetch(recording.videoUrl);
    if (!res.ok) {
      throw new Error("Could not fetch the video file for analysis.");
    }
    const mimeType = res.headers.get("content-type") ?? "video/mp4";
    const blob = await res.blob();

    const uploaded = await ai.files.upload({ file: blob, config: { mimeType } });
    if (!uploaded.name) {
      throw new Error("Gemini did not return a file reference for the upload.");
    }
    uploadedFileName = uploaded.name;

    let file = await ai.files.get({ name: uploaded.name });
    let attempts = 0;
    while (file.state === "PROCESSING" && attempts < 20) {
      await sleep(3000);
      file = await ai.files.get({ name: uploaded.name });
      attempts += 1;
    }
    if (file.state === "FAILED") {
      throw new Error("Gemini failed to process the uploaded video.");
    }
    if (file.state === "PROCESSING") {
      throw new Error("Gemini is still processing the video — try again in a moment.");
    }
    if (!file.uri) {
      throw new Error("Gemini did not return a URI for the processed file.");
    }

    videoPart = { fileData: { fileUri: file.uri, mimeType: file.mimeType } };
  }

  try {
    let response;
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [videoPart, { text: PROMPT }],
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
