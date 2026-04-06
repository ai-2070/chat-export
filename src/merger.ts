import { parseConversations } from "./stream-parser.js";
import type { Conversation } from "./types.js";

/**
 * Merges conversations from multiple files, deduplicating by conversation_id.
 * When duplicates exist, keeps the version with the latest update_time.
 *
 * Uses a two-pass streaming approach:
 * - Pass 1: Lightweight scan to build a registry of {id -> winner file/time}
 * - Pass 2: Re-stream files, only yielding winning conversations
 */
export async function* mergeConversations(
  filePaths: string[],
  verbose: boolean = false
): AsyncGenerator<Conversation> {
  if (filePaths.length === 1) {
    yield* parseConversations(filePaths[0]);
    return;
  }

  // Pass 1: Build registry of which file has the newest version of each conversation
  const registry = new Map<
    string,
    { update_time: number; fileIndex: number }
  >();

  for (let i = 0; i < filePaths.length; i++) {
    if (verbose) {
      process.stderr.write(`  Scanning file ${i + 1}/${filePaths.length}: ${filePaths[i]}\n`);
    }

    for await (const conv of parseConversations(filePaths[i])) {
      const existing = registry.get(conv.conversation_id);
      if (!existing || conv.update_time > existing.update_time) {
        registry.set(conv.conversation_id, {
          update_time: conv.update_time,
          fileIndex: i,
        });
      }
    }
  }

  const totalUnique = registry.size;
  if (verbose) {
    process.stderr.write(`  Found ${totalUnique} unique conversations across ${filePaths.length} files\n`);
  }

  // Pass 2: Re-stream files, emit only winners
  const emitted = new Set<string>();

  for (let i = 0; i < filePaths.length; i++) {
    if (verbose) {
      process.stderr.write(`  Processing file ${i + 1}/${filePaths.length}: ${filePaths[i]}\n`);
    }

    for await (const conv of parseConversations(filePaths[i])) {
      const winner = registry.get(conv.conversation_id);
      if (
        winner &&
        winner.fileIndex === i &&
        winner.update_time === conv.update_time &&
        !emitted.has(conv.conversation_id)
      ) {
        emitted.add(conv.conversation_id);
        yield conv;
      }
    }
  }
}
