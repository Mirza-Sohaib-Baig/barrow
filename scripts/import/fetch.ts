import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { config } from "@/lib/config";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const DATASET_ROOT = "https://mcauleylab.ucsd.edu/public_datasets/data/amazon_2023/raw";

export function metaUrl(dataset: string): string {
  return `${DATASET_ROOT}/meta_categories/meta_${dataset}.jsonl.gz`;
}

export function reviewUrl(dataset: string): string {
  return `${DATASET_ROOT}/review_categories/${dataset}.jsonl.gz`;
}

export function metaPath(dataset: string): string {
  return path.join(RAW_DIR, `meta_${dataset}.jsonl.gz`);
}

export function reviewPath(dataset: string): string {
  return path.join(RAW_DIR, `${dataset}.jsonl.gz`);
}

export class DownloadError extends Error {
  constructor(url: string, status: number) {
    super(`Download failed (${status}): ${url}`);
    this.name = "DownloadError";
  }
}

export async function contentLength(url: string): Promise<number | null> {
  const probe = await fetch(url, {
    headers: { Range: "bytes=0-0" },
    signal: AbortSignal.timeout(60_000),
  });
  if (probe.status === 404) throw new DownloadError(url, 404);
  if (!probe.ok && probe.status !== 206) throw new DownloadError(url, probe.status);
  const total = probe.headers.get("content-range")?.split("/")[1];
  const length = probe.headers.get("content-length");
  await probe.body?.cancel();
  if (total && total !== "*") return Number(total);
  return probe.status === 200 && length ? Number(length) : null;
}

export async function downloadFile(url: string, destination: string, expectedBytes: number | null): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true });
  try {
    const existing = await stat(destination);
    if (existing.size > 0 && (expectedBytes === null || existing.size === expectedBytes)) {
      console.log(`${path.basename(destination)} already present (${existing.size} bytes)`);
      return;
    }
  } catch {
    // The file is not on disk yet.
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(30 * 60_000) });
  if (!response.ok || !response.body) throw new DownloadError(url, response.status);
  const total = Number(response.headers.get("content-length") ?? expectedBytes ?? 0);
  const name = path.basename(destination);
  let received = 0;
  let logged = 0;
  const reader = response.body.getReader();
  const source = new Readable({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
          return;
        }
        received += value.byteLength;
        if (received - logged >= 8 * 1024 * 1024 || (total > 0 && received >= total)) {
          console.log(`${name} ${received} / ${total || "unknown"}`);
          logged = received;
        }
        this.push(Buffer.from(value));
      } catch (error) {
        this.destroy(error instanceof Error ? error : new Error("Download stream failed"));
      }
    },
  });
  await pipeline(source, createWriteStream(destination));
  console.log(`${name} ${received} / ${total || received}`);
}

export function reviewFileTooLarge(bytes: number | null): boolean {
  return bytes !== null && bytes > config.catalogueImport.reviewFileByteLimit;
}
