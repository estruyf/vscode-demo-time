import { defineCollection, z } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { glob } from "astro/loaders";

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  releases: defineCollection({
    loader: glob({
      pattern: "*.md",
      base: "./src/content/docs/releases",
    }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      date: z.preprocess(
        (val) => (typeof val === "string" ? new Date(val) : val),
        z.date()
      ),
      version: z.string(),
      slug: z.string(),
      features: z.array(z.string()).optional(),
      improvements: z.array(z.string()).optional(),
      fixes: z.array(z.string()).optional(),
      lastmod: z.preprocess(
        (val) => (typeof val === "string" ? new Date(val) : val),
        z.date()
      ),
    }),
  }),
  articles: defineCollection({
    loader: glob({
      pattern: "**/index.md",
      base: "./src/content/articles",
    }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      date: z.preprocess(
        (val) => (typeof val === "string" ? new Date(val) : val),
        z.date()
      ),
      slug: z.string().optional(),
      author: z.string(),
      github: z.string(),
      pinned: z.boolean().optional(),
    }),
  }),
};
