import * as jsxRuntime from "react/jsx-runtime";
import rehypeRaw from "rehype-raw";
import rehypeReact, { Components } from "rehype-react";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse, { type Options as RemarkParseOptions } from "remark-parse";
import remarRehype from "remark-rehype";
import { matter } from "vfile-matter";
import { type PluggableList, unified } from "unified";
import { ReactElement } from "react";
import { type Options as RemarkRehypeOptions } from "mdast-util-to-hast";
import { visit } from "unist-util-visit";

export const transformMarkdown = async (
  markdown: string,
  remarkParseOptions?: RemarkParseOptions,
  remarRehypeOptions?: RemarkRehypeOptions,
  remarkPlugins?: PluggableList,
  rehypePlugins?: PluggableList,
  rehypeReactOptions?: {
    components?: Partial<Components>;
  }
): Promise<{
  reactContent: ReactElement | null;
  metadata: any | null;
}> => {
  const vFile = await unified()
    .use(remarkParse, remarkParseOptions)
    .use(() => (tree) => {
      visit(tree, (node: any) => {
        if (node.type === "code" && node.lang === "mermaid") {
          const code = node.value.trim();
          node.type = "html";
          node.value = `<pre class="mermaid">${code}</pre>`;
        }
      });
    })
    .use(remarRehype, {
      ...remarRehypeOptions,
      allowDangerousHtml: true,
    })
    .use(rehypeRaw)
    .use(remarkPlugins || [])
    .use(rehypePlugins || [])
    .use(rehypeReact, {
      ...rehypeReactOptions,
      Fragment: jsxRuntime.Fragment,
      jsx: jsxRuntime.jsx,
      jsxs: jsxRuntime.jsxs,
    })
    .use(remarkFrontmatter)
    .use(() => (_, file) => {
      try {
        matter(file);
      } catch (err) {
        // Catch error and ignore it
      }
    })
    .process(markdown);

  return {
    reactContent: vFile.result as ReactElement,
    metadata: vFile.data?.matter || {},
  };
};

/* Converting to HTML instead of React element */
// const processor = unified()
//   .use(remarkParse)
//   .use(remarkRehype, {
//     allowDangerousHtml: true,
//   })
//   .use(rehypeRaw)
//   .use(rehypePrettyCode, { theme: theme ? theme : {} })
//   .use(remarkFrontmatter)
//   .use(rehypeStringify)
//   .use(() => (_, file) => {
//     try {
//       matter(file);
//     } catch (err) {
//       // Catch error and ignore it
//     }
//   });
