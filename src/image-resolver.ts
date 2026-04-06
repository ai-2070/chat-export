import { readdir } from "fs/promises";
import { dirname } from "path";
import type { Conversation } from "./types.js";

// Cache directory listings to avoid redundant reads
const dirCache = new Map<string, string[]>();

async function listDir(dir: string): Promise<string[]> {
  let entries = dirCache.get(dir);
  if (!entries) {
    entries = await readdir(dir);
    dirCache.set(dir, entries);
  }
  return entries;
}

function extractFileId(assetPointer: string): string | null {
  // file-service://file-XXX → file-XXX
  if (assetPointer.startsWith("file-service://")) {
    return assetPointer.slice("file-service://".length);
  }
  // sediment://file_XXX → file_XXX
  if (assetPointer.startsWith("sediment://")) {
    return assetPointer.slice("sediment://".length);
  }
  return null;
}

function collectAssetPointers(conv: Conversation): string[] {
  const pointers: string[] = [];
  if (!conv.mapping) return pointers;
  for (const node of Object.values(conv.mapping)) {
    const msg = node.message;
    if (!msg?.content) continue;
    const content = msg.content;
    if (
      (content.content_type === "multimodal_text" ||
        content.content_type === "text") &&
      "parts" in content &&
      Array.isArray(content.parts)
    ) {
      for (const part of content.parts) {
        if (
          typeof part === "object" &&
          part !== null &&
          "asset_pointer" in part &&
          typeof (part as { asset_pointer: string }).asset_pointer === "string"
        ) {
          pointers.push((part as { asset_pointer: string }).asset_pointer);
        }
      }
    }
  }
  return pointers;
}

export async function resolveImages(
  conv: Conversation,
  filePath: string
): Promise<Map<string, { sourceDir: string; filename: string }>> {
  const imageMap = new Map<string, { sourceDir: string; filename: string }>();
  const pointers = collectAssetPointers(conv);

  if (pointers.length === 0) return imageMap;

  const sourceDir = dirname(filePath);
  const entries = await listDir(sourceDir);

  for (const pointer of pointers) {
    const fileId = extractFileId(pointer);
    if (!fileId) continue;

    const match = entries.find((e) => e.startsWith(fileId));
    if (match) {
      imageMap.set(pointer, { sourceDir, filename: match });
    }
  }

  return imageMap;
}
