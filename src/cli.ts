#!/usr/bin/env node

import { Command } from "commander";
import { readdir, stat } from "fs/promises";
import { join, extname } from "path";
import { mergeConversations } from "./merger.js";
import { writeConversations } from "./writer.js";
import type { OutputOptions } from "./types.js";

const program = new Command();

program
  .name("chat-export")
  .description("Convert ChatGPT and Claude JSON exports to markdown files")
  .version("1.0.0")
  .argument("<paths...>", "JSON files or directories containing JSON files")
  .option("-o, --output <dir>", "Output directory", "./output")
  .option(
    "-n, --naming <mode>",
    'File naming mode: "title", "id", or "date-title"',
    "date-title"
  )
  .option("--include-archived", "Include archived conversations", false)
  .option("--include-tool-msgs", "Include tool/system messages", false)
  .option("--model <slug>", "Filter to conversations using this model only")
  .option("--after <date>", "Only conversations created after this date (YYYY-MM-DD)")
  .option("--before <date>", "Only conversations created before this date (YYYY-MM-DD)")
  .option("--single-file", "Output all conversations to a single markdown file", false)
  .option("--dry-run", "Show what would be generated without writing files", false)
  .option("-v, --verbose", "Verbose output with progress", false)
  .action(async (paths: string[], opts) => {
    const options: OutputOptions = {
      outputDir: opts.output,
      naming: opts.naming as OutputOptions["naming"],
      includeArchived: opts.includeArchived,
      includeToolMessages: opts.includeToolMsgs,
      model: opts.model,
      after: opts.after ? new Date(opts.after) : undefined,
      before: opts.before ? new Date(opts.before) : undefined,
      singleFile: opts.singleFile,
      dryRun: opts.dryRun,
      verbose: opts.verbose,
    };

    const files = await resolveInputPaths(paths, options.verbose);

    if (files.length === 0) {
      process.stderr.write("No JSON files found in the provided paths.\n");
      process.exit(1);
    }

    if (options.verbose || options.dryRun) {
      process.stderr.write(
        `Processing ${files.length} file(s) -> ${options.outputDir}\n`
      );
    }

    const conversations = mergeConversations(files, options.verbose);
    const result = await writeConversations(conversations, options);

    process.stderr.write(
      `\nDone: ${result.written} written, ${result.skipped} skipped, ${result.errors} errors\n`
    );
  });

program.parse();

async function resolveInputPaths(
  paths: string[],
  verbose: boolean
): Promise<string[]> {
  const files: string[] = [];

  for (const p of paths) {
    const info = await stat(p);
    if (info.isDirectory()) {
      const entries = await readdir(p);
      const jsonFiles = entries
        .filter((e) => extname(e).toLowerCase() === ".json")
        .map((e) => join(p, e))
        .sort();

      if (verbose) {
        process.stderr.write(
          `  Found ${jsonFiles.length} JSON file(s) in ${p}\n`
        );
      }

      files.push(...jsonFiles);
    } else {
      files.push(p);
    }
  }

  return files;
}
