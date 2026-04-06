import { mkdir, writeFile, copyFile } from "fs/promises";
import { join } from "path";
import sanitize from "sanitize-filename";
import type { Conversation, OutputOptions } from "./types.js";
import { extractLinearMessages } from "./tree-walker.js";
import { renderMarkdown } from "./markdown-renderer.js";

export async function writeConversations(
  conversations: AsyncGenerator<Conversation>,
  options: OutputOptions
): Promise<{ written: number; skipped: number; errors: number }> {
  await mkdir(options.outputDir, { recursive: true });

  const usedNames = new Map<string, number>();
  let written = 0;
  let skipped = 0;
  let errors = 0;

  if (options.singleFile) {
    return writeSingleFile(conversations, options, usedNames);
  }

  for await (const conv of conversations) {
    if (shouldSkip(conv, options)) {
      skipped++;
      continue;
    }

    try {
      const messages = extractLinearMessages(conv, options.includeToolMessages);
      if (messages.length === 0) {
        skipped++;
        continue;
      }

      const markdown = renderMarkdown(conv, messages);
      const filename = generateFilename(conv, options.naming, usedNames);

      if (options.dryRun) {
        process.stderr.write(`  [dry-run] ${filename} (${messages.length} messages)\n`);
      } else {
        await writeFile(join(options.outputDir, filename), markdown, "utf-8");
        await copyImages(conv, options);
      }

      if (options.verbose) {
        process.stderr.write(`  Written: ${filename} (${messages.length} messages)\n`);
      }

      written++;
    } catch (err) {
      errors++;
      process.stderr.write(
        `  Error processing "${conv.title}": ${err instanceof Error ? err.message : err}\n`
      );
    }
  }

  return { written, skipped, errors };
}

async function writeSingleFile(
  conversations: AsyncGenerator<Conversation>,
  options: OutputOptions,
  _usedNames: Map<string, number>
): Promise<{ written: number; skipped: number; errors: number }> {
  const parts: string[] = [];
  let written = 0;
  let skipped = 0;
  let errors = 0;

  for await (const conv of conversations) {
    if (shouldSkip(conv, options)) {
      skipped++;
      continue;
    }

    try {
      const messages = extractLinearMessages(conv, options.includeToolMessages);
      if (messages.length === 0) {
        skipped++;
        continue;
      }

      parts.push(renderMarkdown(conv, messages));
      await copyImages(conv, options);
      written++;
    } catch (err) {
      errors++;
      process.stderr.write(
        `  Error processing "${conv.title}": ${err instanceof Error ? err.message : err}\n`
      );
    }
  }

  const combined = parts.join("\n\n---\n\n# \n\n");
  const outPath = join(options.outputDir, "conversations.md");

  if (options.dryRun) {
    process.stderr.write(`  [dry-run] ${outPath} (${written} conversations)\n`);
  } else {
    await writeFile(outPath, combined, "utf-8");
  }

  if (options.verbose) {
    process.stderr.write(`  Written: ${outPath} (${written} conversations)\n`);
  }

  return { written, skipped, errors };
}

function shouldSkip(conv: Conversation, options: OutputOptions): boolean {
  if (!options.includeArchived && conv.is_archived) return true;
  if (options.model && conv.default_model_slug !== options.model) return true;

  if (options.after) {
    const created = new Date(conv.create_time * 1000);
    if (created < options.after) return true;
  }

  if (options.before) {
    const created = new Date(conv.create_time * 1000);
    if (created > options.before) return true;
  }

  return false;
}

function generateFilename(
  conv: Conversation,
  naming: "title" | "id" | "date-title",
  usedNames: Map<string, number>
): string {
  let base: string;

  switch (naming) {
    case "id":
      base = conv.conversation_id;
      break;
    case "title":
      base = slugify(conv.title || "untitled");
      break;
    case "date-title":
    default: {
      const date = new Date(conv.create_time * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const titleSlug = slugify(conv.title || "untitled");
      base = `${dateStr}-${titleSlug}`;
      break;
    }
  }

  // Handle collisions
  const count = usedNames.get(base) ?? 0;
  usedNames.set(base, count + 1);

  const filename = count === 0 ? `${base}.md` : `${base}-${count + 1}.md`;
  return sanitize(filename);
}

async function copyImages(
  conv: Conversation,
  options: OutputOptions
): Promise<void> {
  if (!conv.imageMap || conv.imageMap.size === 0) return;

  const imagesDir = join(options.outputDir, "images");
  await mkdir(imagesDir, { recursive: true });

  for (const [, { sourceDir, filename }] of conv.imageMap) {
    const src = join(sourceDir, filename);
    const dest = join(imagesDir, filename);

    try {
      await copyFile(src, dest);
    } catch {
      if (options.verbose) {
        process.stderr.write(`  Warning: could not copy image ${filename}\n`);
      }
    }
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
