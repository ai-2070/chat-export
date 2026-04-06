import { createReadStream } from "fs";
import streamArray from "stream-json/streamers/stream-array.js";
import type { Conversation } from "./types.js";
import type { ClaudeConversation } from "./claude-types.js";
import { normalizeClaudeConversation } from "./claude-normalizer.js";
import { resolveImages } from "./image-resolver.js";

function isClaudeConversation(obj: unknown): obj is ClaudeConversation {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "uuid" in obj &&
    "chat_messages" in obj
  );
}

export async function* parseConversations(
  filePath: string
): AsyncGenerator<Conversation> {
  const source = createReadStream(filePath, { encoding: "utf-8" });
  const stream = streamArray.withParserAsStream();

  source.pipe(stream);

  try {
    for await (const data of stream) {
      const value = (data as { key: number; value: unknown }).value;

      let conv: Conversation;
      if (isClaudeConversation(value)) {
        conv = normalizeClaudeConversation(value);
      } else {
        conv = value as Conversation;
      }
      conv.imageMap = await resolveImages(conv, filePath);
      yield conv;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Top-level object should be an array")) {
      process.stderr.write(`  Skipping ${filePath} (not a conversation array)\n`);
      return;
    }
    throw err;
  }
}
