import type { Conversation, MappingNode, Message } from "./types.js";
import type { ClaudeConversation, ClaudeChatMessage } from "./claude-types.js";

/**
 * Converts a Claude conversation into the internal Conversation format
 * so the rest of the pipeline (renderer, writer) works unchanged.
 */
export function normalizeClaudeConversation(
  claude: ClaudeConversation
): Conversation {
  const createTime = new Date(claude.created_at).getTime() / 1000;
  const updateTime = new Date(claude.updated_at).getTime() / 1000;

  // Filter out messages with no text content
  const messages = claude.chat_messages.filter((m) => hasContent(m));

  // Build a flat mapping that mimics ChatGPT's tree structure.
  // Claude messages are already linear, so we create a simple chain.
  const rootId = "root";
  const mapping: Record<string, MappingNode> = {};

  // Root node (no message)
  mapping[rootId] = {
    id: rootId,
    parent: null,
    children: messages.length > 0 ? [messages[0].uuid] : [],
    message: null,
  };

  let lastNodeId = rootId;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const nextId = i + 1 < messages.length ? messages[i + 1].uuid : undefined;

    mapping[msg.uuid] = {
      id: msg.uuid,
      parent: lastNodeId,
      children: nextId ? [nextId] : [],
      message: convertMessage(msg),
    };

    lastNodeId = msg.uuid;
  }

  const currentNode =
    messages.length > 0
      ? messages[messages.length - 1].uuid
      : rootId;

  return {
    conversation_id: claude.uuid,
    title: claude.name || deriveTitle(claude),
    create_time: createTime,
    update_time: updateTime,
    current_node: currentNode,
    default_model_slug: "claude",
    mapping,
    is_archived: false,
  };
}

function convertMessage(msg: ClaudeChatMessage): Message {
  const role = msg.sender === "human" ? "user" : "assistant";
  const createTime = new Date(msg.created_at).getTime() / 1000;

  // Build text from content blocks, falling back to msg.text
  let text = "";
  if (msg.content && msg.content.length > 0) {
    text = msg.content
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text!)
      .join("\n");
  }
  if (!text) {
    text = msg.text || "";
  }

  // Include attachment content as context
  const attachmentTexts: string[] = [];
  if (msg.attachments && msg.attachments.length > 0) {
    for (const att of msg.attachments) {
      if (att.file_name) {
        attachmentTexts.push(`📎 **${att.file_name}**`);
      }
      if (att.extracted_content) {
        attachmentTexts.push(att.extracted_content);
      }
    }
  }

  const fullText = attachmentTexts.length > 0
    ? [...attachmentTexts, "", text].join("\n")
    : text;

  return {
    id: msg.uuid,
    author: {
      role: role as "user" | "assistant",
      metadata: {},
    },
    content: {
      content_type: "text",
      parts: [fullText],
    },
    create_time: createTime,
    status: "finished_successfully",
    end_turn: role === "assistant" ? true : null,
    metadata: {},
  };
}

function hasContent(msg: ClaudeChatMessage): boolean {
  if (msg.content && msg.content.length > 0) {
    const text = msg.content
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text!)
      .join("");
    if (text.trim()) return true;
  }
  if (msg.text && msg.text.trim()) return true;
  if (msg.attachments && msg.attachments.length > 0) return true;
  return false;
}

function deriveTitle(claude: ClaudeConversation): string {
  const firstHuman = claude.chat_messages.find((m) => m.sender === "human");
  if (!firstHuman) return "Untitled";

  const text =
    firstHuman.content?.find((b) => b.type === "text")?.text ||
    firstHuman.text ||
    "";

  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "Untitled";

  return trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed;
}
