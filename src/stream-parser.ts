import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import streamArray from "stream-json/streamers/stream-array.js";
import type { Conversation } from "./types.js";
import type { ClaudeConversation } from "./claude-types.js";
import { normalizeClaudeConversation } from "./claude-normalizer.js";

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

  for await (const data of stream) {
    const value = (data as { key: number; value: unknown }).value;

    if (isClaudeConversation(value)) {
      yield normalizeClaudeConversation(value);
    } else {
      yield value as Conversation;
    }
  }
}
