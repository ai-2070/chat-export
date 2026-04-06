export interface Conversation {
  conversation_id: string;
  title: string;
  create_time: number;
  update_time: number;
  current_node: string;
  default_model_slug: string;
  mapping: Record<string, MappingNode>;
  is_archived: boolean;
}

export interface MappingNode {
  id: string;
  parent: string | null;
  children: string[];
  message: Message | null;
}

export interface Message {
  id: string;
  author: {
    role: "user" | "assistant" | "system" | "tool";
    name?: string | null;
    metadata: Record<string, unknown>;
  };
  content: MessageContent;
  create_time: number | null;
  status: string;
  end_turn: boolean | null;
  metadata: MessageMetadata;
}

export type MessageContent =
  | { content_type: "text"; parts: (string | null)[] }
  | { content_type: "multimodal_text"; parts: (string | MultimodalPart)[] }
  | { content_type: "code"; text: string; language?: string }
  | { content_type: string; parts?: unknown[]; text?: string };

export type MultimodalPart =
  | string
  | {
      asset_pointer?: string;
      content_type?: string;
      width?: number;
      height?: number;
    };

export interface MessageMetadata {
  model_slug?: string;
  is_visually_hidden_from_conversation?: boolean;
  command?: string;
  finished_text?: string;
  [key: string]: unknown;
}

export interface OutputOptions {
  outputDir: string;
  naming: "title" | "id" | "date-title";
  includeArchived: boolean;
  includeToolMessages: boolean;
  model?: string;
  after?: Date;
  before?: Date;
  singleFile: boolean;
  dryRun: boolean;
  verbose: boolean;
}
