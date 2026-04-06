import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { PassThrough, Transform } from "stream";
import pkg from "stream-json";
import StreamArrayPkg from "stream-json/streamers/StreamArray.js";
import type { Conversation } from "./types.js";
import type { ClaudeConversation } from "./claude-types.js";
import { normalizeClaudeConversation } from "./claude-normalizer.js";

const { parser } = pkg;
const { streamArray } = StreamArrayPkg;

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
  const jsonParser = parser();
  const arrayStreamer = streamArray();

  source.pipe(jsonParser).pipe(arrayStreamer);

  for await (const data of arrayStreamer) {
    const value = (data as { key: number; value: unknown }).value;

    if (isClaudeConversation(value)) {
      yield normalizeClaudeConversation(value);
    } else {
      yield value as Conversation;
    }
  }

  // Ensure cleanup
  source.destroy();
}
