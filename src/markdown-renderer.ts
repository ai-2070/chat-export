import type { Conversation, Message, MultimodalPart } from "./types.js";

export function renderMarkdown(
  conversation: Conversation,
  messages: Message[]
): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${conversation.title || "Untitled Conversation"}`);
  lines.push("");
  lines.push(`- **Created**: ${formatTimestamp(conversation.create_time)}`);
  lines.push(`- **Updated**: ${formatTimestamp(conversation.update_time)}`);
  lines.push(`- **Model**: ${conversation.default_model_slug || "unknown"}`);
  lines.push(
    `- **Conversation ID**: \`${conversation.conversation_id}\``
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // Messages
  for (const msg of messages) {
    lines.push(renderMessage(msg, conversation.imageMap));
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function renderMessage(
  msg: Message,
  imageMap?: Map<string, { sourceDir: string; filename: string }>
): string {
  const heading = getMessageHeading(msg);
  const body = renderContent(msg, imageMap);
  return `## ${heading}\n\n${body}`;
}

function getMessageHeading(msg: Message): string {
  const role = msg.author.role;

  if (role === "user") return "User";

  if (role === "assistant") {
    const model = msg.metadata?.model_slug;
    return model ? `Assistant (${model})` : "Assistant";
  }

  if (role === "tool") {
    const name = msg.author.name;
    return name ? `Tool (${name})` : "Tool";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function renderContent(
  msg: Message,
  imageMap?: Map<string, { sourceDir: string; filename: string }>
): string {
  const content = msg.content;

  if (content.content_type === "text" && content.parts) {
    return cleanChatGPTArtifacts(
      content.parts
        .filter((p): p is string => typeof p === "string")
        .join("\n")
    );
  }

  if (content.content_type === "multimodal_text" && content.parts) {
    return cleanChatGPTArtifacts(
      content.parts
        .map((part) => {
          if (typeof part === "string") return part;
          return renderMultimodalPart(part as MultimodalPart, imageMap);
        })
        .filter(Boolean)
        .join("\n")
    );
  }

  if (content.content_type === "code" && "text" in content) {
    const lang = "language" in content ? (content as { language?: string }).language || "" : "";
    return `\`\`\`${lang}\n${content.text}\n\`\`\``;
  }

  // Fallback for unknown content types
  if ("parts" in content && Array.isArray(content.parts)) {
    return content.parts
      .filter((p): p is string => typeof p === "string")
      .join("\n");
  }

  if ("text" in content && typeof content.text === "string") {
    return content.text;
  }

  return "*[unsupported content type: " + content.content_type + "]*";
}

function renderMultimodalPart(
  part: MultimodalPart,
  imageMap?: Map<string, { sourceDir: string; filename: string }>
): string {
  if (typeof part === "string") return part;
  if (part.asset_pointer) {
    const resolved = imageMap?.get(part.asset_pointer);
    if (resolved) {
      return `![Image](./images/${resolved.filename})`;
    }
    return `![Image](${part.asset_pointer})`;
  }
  return "";
}

/**
 * Strip ChatGPT internal artifacts from text:
 * - Private Use Area characters (U+E200-U+E206): internal formatting markers
 * - 【{...}】 brackets: image fetch directives and citation refs
 * - :::contextList blocks: internal context rendering directives
 */
function cleanChatGPTArtifacts(text: string): string {
  return text
    // Remove PUA characters (U+E200-U+E2FF range)
    .replace(/[\uE200-\uE2FF]/g, "")
    // Remove 【{...}】 bracket directives (image_fetch, citations, etc.)
    .replace(/【[^】]*】/g, "")
    // Remove :::contextList blocks (up to next blank line or end)
    .replace(/:::contextList\n?/g, "")
    // Clean up resulting double+ blank lines
    .replace(/\n{3,}/g, "\n\n");
}

function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return "unknown";
  const date = new Date(ts * 1000);
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}
