#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import Fuse, { FuseResult } from "fuse.js";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the search index and data for fuse.js
const searchIndexDir = path.join(__dirname, "..", "searchindex");
const indexJsonPath = path.join(searchIndexDir, "index.json");
const dataJsonPath = path.join(searchIndexDir, "data.json");

if (!fs.existsSync(indexJsonPath) || !fs.existsSync(dataJsonPath)) {
  throw new Error("Search index or data file not found.");
}

const indexJson = JSON.parse(fs.readFileSync(indexJsonPath, "utf8"));
const data: Array<{
  id: string;
  title: string;
  content: string;
  tags?: string[];
}> = JSON.parse(fs.readFileSync(dataJsonPath, "utf8"));

// Recreate the Fuse index from the serialized index
const fuseIndex = Fuse.parseIndex(indexJson);
const fuse = new Fuse(
  data,
  {
    keys: ["title", "content", "description", "slug"],
    useExtendedSearch: true,
    ignoreLocation: true,
    threshold: 0.3,
    fieldNormWeight: 2,
  },
  fuseIndex
);

// Create an MCP server
// Read version from package.json
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version || "0.1.0";

const server = new McpServer({
  name: "Demo Time",
  version,
});

/**
 * Convert Fuse.js search results into a single Markdown string.
 *
 * Accepts an array of FuseResult objects whose `item` is expected to contain
 * `id`, `title`, and `content` properties. Results are sorted by score
 * (lower is better), deduplicated by `id` (first occurrence kept), and then
 * rendered as Markdown: each document becomes a top-level header (`# Title`)
 * followed by its content, with documents separated by `---`. If `score` is
 * absent it is treated as 0. Returns an empty string when no valid items are provided.
 *
 * @param searchResults - Raw results returned by Fuse.js
 * @returns Markdown-formatted concatenation of unique documents
 */
function squashSearchResults(searchResults: Array<FuseResult<any>>): string {
  // Sort results by score (lowest score = best match)
  const sortedResults = [...searchResults].sort(
    (a, b) => (a.score ?? 0) - (b.score ?? 0)
  );

  // Create a map to track unique documents by ID
  const uniqueDocsMap = new Map<string, { title: string; content: string }>();

  sortedResults.forEach((result) => {
    const doc = result.item;
    if (!uniqueDocsMap.has(doc.id)) {
      uniqueDocsMap.set(doc.id, {
        title: doc.title,
        content: doc.content,
      });
    }
  });

  // Convert map to markdown formatted string
  const uniqueDocs = Array.from(uniqueDocsMap.values());

  // Build markdown string
  let markdownResults = "";
  uniqueDocs.forEach((doc) => {
    markdownResults += `# ${doc.title}\n\n${doc.content}\n\n---\n\n`;
  });

  return markdownResults;
}

server.tool(
  "search",
  "Search in Demo Time documentation using keywords",
  { query: z.string().min(1) },
  async ({ query }) => {
    const rawResults = fuse.search(`"${query}"`, { limit: 10 });
    const markdownResults = squashSearchResults(rawResults);
    return {
      content: [
        {
          type: "text",
          text: markdownResults,
        },
      ],
    };
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
