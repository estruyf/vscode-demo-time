import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const releases = await getCollection("releases");

  return rss({
    title: "Demo Time Releases",
    description: "All the latest releases of Demo Time",
    site: context.site || "https://demotime.show",
    items: releases.map((release) => ({
      link: `/releases/${release.data.slug}/`,
      title: release.data.title,
      description: release.data.description,
      pubDate: new Date(release.data.date),
      content: release.body,
    })),
    customData: `<language>en-us</language>`,
  });
}
