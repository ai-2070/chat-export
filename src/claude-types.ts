export interface ClaudeConversation {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  chat_messages: ClaudeChatMessage[];
}

export interface ClaudeChatMessage {
  uuid: string;
  text: string;
  sender: "human" | "assistant";
  created_at: string;
  updated_at: string;
  attachments: ClaudeAttachment[];
  files: ClaudeFile[];
  content: ClaudeContentBlock[];
}

export interface ClaudeAttachment {
  file_name?: string;
  file_size?: number;
  file_type?: string;
  extracted_content?: string;
  [key: string]: unknown;
}

export interface ClaudeFile {
  file_name?: string;
  file_type?: string;
  [key: string]: unknown;
}

export interface ClaudeContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}
