# Snippets

This directory contains code snippets that can be used in your projects. Each snippet is a self-contained piece of code that can be copied and pasted into your project.

## Prerequisites

Create a `snippets` folder in the `.demo` directory of your project. This is where you will store your snippets.

> [!NOTE]
> You can change name of the snippets folder, but you will need to update the `contentPath` in the snippet action.

## Insert and highlight code

The [insert_and_highlight.json](./insert_and_highlight.json) snippet contains a couple of steps to insert code and highlight specific lines after inserting the content.

You can configure the snippet action as follows:

```json
{
  "action": "snippet",
  "contentPath": "./snippets/insert_and_highlight.json",
  "args": {
    "MAIN_FILE": "<relative path from workspace to the file to update>",
    "CONTENT_PATH": "<relative path in .demo folder to the file with the contents to insert>",
    "CONTENT_POSITION": "<line number>",
    "HIGHLIGHT_POSITION": "<line number>:<line number>"
  }
}
```

## Show slide

The [show_slide.json](./show_slide.json) snippet contains a step to show a slide within Visual Studio Code.

You can configure the snippet action as follows:

```json
{
  "action": "snippet",
  "contentPath": "./snippets/show_slide.json",
  "args": {
    "SLIDES_URL": "<URL to the slide>"
  }
}
```

> [!NOTE]
> I'm making use of [Slidev](https://sli.dev/) to create slides and as it generates a site, I can use the URL to show the slide in Visual Studio Code.

## Reset view after slide

The [reset_view_after_slide.json](./reset_view_after_slide.json) snippet contains the steps to reset the view after showing a slide.

You can configure the snippet action as follows:

```json
{
  "action": "snippet",
  "contentPath": "./snippets/reset_view_after_slide.json"
}
```
