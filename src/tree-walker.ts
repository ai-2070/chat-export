import type { Conversation, Message } from "./types.js";

export function extractLinearMessages(
  conversation: Conversation,
  includeToolMessages: boolean
): Message[] {
  const { mapping, current_node } = conversation;

  // Walk backward from current_node to root via parent pointers
  const path: string[] = [];
  const visited = new Set<string>();
  let nodeId: string | null = current_node;

  while (nodeId && !visited.has(nodeId)) {
    visited.add(nodeId);
    path.push(nodeId);
    nodeId = mapping[nodeId]?.parent ?? null;
  }

  path.reverse();

  return path
    .map((id) => mapping[id]?.message)
    .filter((msg): msg is Message => {
      if (!msg) return false;

      // Skip hidden messages (internal tool calls ChatGPT hides in the UI)
      if (msg.metadata?.is_visually_hidden_from_conversation) return false;

      // Skip system messages
      if (msg.author.role === "system") return false;

      // Skip tool messages unless opted in
      if (msg.author.role === "tool" && !includeToolMessages) return false;

      // Skip empty assistant messages (streaming placeholders)
      if (
        msg.author.role === "assistant" &&
        msg.end_turn === null &&
        getTextContent(msg) === ""
      ) {
        return false;
      }

      return true;
    });
}

function getTextContent(msg: Message): string {
  const content = msg.content;
  if (content.content_type === "text" && content.parts) {
    return content.parts.filter((p): p is string => typeof p === "string").join("");
  }
  if (content.content_type === "code" && "text" in content) {
    return content.text ?? "";
  }
  if (content.content_type === "multimodal_text" && content.parts) {
    return content.parts
      .filter((p): p is string => typeof p === "string")
      .join("");
  }
  return "";
}
