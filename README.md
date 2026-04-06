# @ai2070/chat-export

Convert ChatGPT and Claude JSON exports to markdown files.

## Usage

```bash
npx @ai2070/chat-export <files or directories> [options]
```

### Examples

```bash
# Convert a single export file
npx @ai2070/chat-export conversations.json

# Convert multiple files
npx @ai2070/chat-export chatgpt-export.json claude-export.json

# Convert all JSON files in a directory
npx @ai2070/chat-export ./exports/

# Custom output directory
npx @ai2070/chat-export conversations.json -o ./my-markdown

# Preview without writing files
npx @ai2070/chat-export conversations.json --dry-run

# Combine all conversations into a single file
npx @ai2070/chat-export conversations.json --single-file
```

### Options

| Option | Description | Default |
|---|---|---|
| `-o, --output <dir>` | Output directory | `./output` |
| `-n, --naming <mode>` | File naming: `title`, `id`, or `date-title` | `date-title` |
| `--include-archived` | Include archived conversations | `false` |
| `--include-tool-msgs` | Include tool/system messages | `false` |
| `--model <slug>` | Filter by model (e.g. `gpt-4o`, `claude`) | |
| `--after <date>` | Only conversations after date (YYYY-MM-DD) | |
| `--before <date>` | Only conversations before date (YYYY-MM-DD) | |
| `--single-file` | Output all conversations to one markdown file | `false` |
| `--dry-run` | Preview what would be generated | `false` |
| `-v, --verbose` | Verbose output | `false` |

## Supported formats

- **ChatGPT** — Export from Settings > Data controls > Export data
- **Claude** — Export from Settings > Account > Export data

The format is detected automatically. You can mix both formats in a single run.

## Images

ChatGPT exports include uploaded images alongside the conversation JSON files. These are automatically detected, copied to an `images/` folder in the output directory, and referenced with relative paths in the markdown so they render inline.

Claude exports do not include image files — only metadata about uploads. Image references in Claude conversations are preserved as-is.

## License

[Apache-2.0](LICENSE)
