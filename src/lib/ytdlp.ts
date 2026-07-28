import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const EXTENSION_MIME_TYPES: Record<string, string> = {
  m4a: "audio/mp4",
  webm: "audio/webm",
  opus: "audio/ogg",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  aac: "audio/aac",
  wav: "audio/wav",
};

function binaryPath(): string {
  const filename = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  return path.join(process.cwd(), "bin", filename);
}

function runYtDlp(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binaryPath(), args);
    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`yt-dlp exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });
}

export async function downloadYoutubeAudio(
  youtubeId: string
): Promise<{ blob: Blob; mimeType: string }> {
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;
  const dir = await mkdtemp(path.join(tmpdir(), "ytdlp-"));

  try {
    await runYtDlp([
      "-f",
      "bestaudio",
      "--no-playlist",
      "--no-part",
      "-o",
      path.join(dir, "audio.%(ext)s"),
      url,
    ]);

    const files = await readdir(dir);
    const audioFile = files[0];
    if (!audioFile) {
      throw new Error("yt-dlp did not produce an output file.");
    }

    const buffer = await readFile(path.join(dir, audioFile));
    const ext = path.extname(audioFile).slice(1).toLowerCase();
    const mimeType = EXTENSION_MIME_TYPES[ext] ?? "audio/mp4";

    return { blob: new Blob([buffer], { type: mimeType }), mimeType };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
