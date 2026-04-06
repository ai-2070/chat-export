import { createReadStream } from "fs";
import { pipeline } from "stream/promises";
import { PassThrough, Transform } from "stream";
import pkg from "stream-json";
import StreamArrayPkg from "stream-json/streamers/StreamArray.js";
import type { Conversation } from "./types.js";

const { parser } = pkg;
const { streamArray } = StreamArrayPkg;

export async function* parseConversations(
  filePath: string
): AsyncGenerator<Conversation> {
  const source = createReadStream(filePath, { encoding: "utf-8" });
  const jsonParser = parser();
  const arrayStreamer = streamArray();

  source.pipe(jsonParser).pipe(arrayStreamer);

  for await (const data of arrayStreamer) {
    yield (data as { key: number; value: Conversation }).value;
  }

  // Ensure cleanup
  source.destroy();
}
