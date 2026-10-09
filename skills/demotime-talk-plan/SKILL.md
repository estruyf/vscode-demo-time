---
name: demotime-talk-plan
description: Plan a talk, workshop or live coding session that is presented with Demo Time, the VS Code extension for slides and scripted live demos. Use when someone asks to plan, outline or structure a talk, presentation or demo about a topic, or wants help deciding what goes on slides and what to show live. Interviews the speaker when information is missing and writes .demo/talk-plan.md, which the demotime-slides and demotime-code-demo skills build on.
argument-hint: '[topic, abstract, or links to material]'
---

# Plan a Demo Time talk

Turn a topic and whatever material the speaker has into a talk plan: the story, the sections, the
key messages, and where slides and live demos go. The result is `.demo/talk-plan.md`, the input for
the `demotime-slides` and `demotime-code-demo` skills.

Demo Time organizes a presentation as a **Play** (the `.demo` folder) with **Acts** (act files),
**Scenes** (the steps you trigger while presenting) and **Moves** (the actions a scene runs). Use
these terms in the plan. See [terminology](references/terminology.md) and
[presenting](references/presenting.md) for what Demo Time can do on stage (presenter view, notes,
timer).

## 1. Collect what is already there

Before asking anything, read what the speaker already gave you and what is in the workspace:

- The request itself: topic, audience, length, abstract, links.
- Material they point to: a blog post, README, abstract, slides outline or repository. When the talk
  is about code in the workspace, skim the README and the files they want to show.
- An existing plan in `.demo/talk-plan.md`. Update it instead of starting over, and say what you
  changed.
- An interview transcript (for example `INTERVIEW.md`), existing acts (`.demo/*.json`,
  `.demo/*.yaml`) and slides (`.demo/slides/*.md`).

## 2. Interview for what is missing

You need these answers. Skip every question the material already answers.

| Topic         | What to find out                                                                 |
| ------------- | -------------------------------------------------------------------------------- |
| Audience      | Who attends and their level (beginner, intermediate, advanced)                   |
| Length        | Minutes, including Q&A                                                           |
| Format        | Conference talk, meetup, workshop, internal demo, recording                      |
| Key messages  | The one to three things people should remember or be able to do afterwards       |
| Live demos    | Which parts must be shown live, in which repository or files, and the end result |
| Story         | A hook, a personal experience, a problem the audience recognizes                 |
| Constraints   | Offline venue, screen size, tools that need to be installed, time for Q&A        |
| Look and feel | Brand, colours or an existing theme (optional; only when slides follow)          |

Interview rules:

- Ask **one question per message** and wait for the answer. Use a structured question tool when your
  environment has one (for example to pick the audience level from options).
- Suggest answers when you can infer them ("Sounds like an intermediate audience, right?").
- Do not invent facts, code, numbers, quotes or experiences for the speaker. Ask for the real ones.
- Stop when you have enough, or when the speaker says to go ahead. Then work with clearly labelled
  assumptions and list them in the plan.

## 3. Shape the talk

- **Story first.** Open with a hook (a problem, a question, a surprising result), build towards the
  key messages, close with a takeaway and a call to action.
- **Time budget.** Count roughly one to two minutes per content slide. Keep each live demo segment
  short (3 to 8 minutes) and spend at most about 40% of the talk in live demos unless it is a
  workshop. Leave time for Q&A when the format has it.
- **Slides or live?** Show live what the audience must see happen: code being written, a command
  running, a tool reacting. Put concepts, diagrams, comparisons and conclusions on slides.
- **One key message per section.** When a section has no clear message, merge or drop it.
- **Demo safety.** For every live demo, note the starting state (so it can be reset and rerun) and a
  fallback (a slide with a screenshot, a recorded video or a finished branch).
- **Map to Demo Time.** One act per section works well for longer talks; a short talk can use a
  single act. Each slide file and each demo step becomes a scene.

## 4. Write `.demo/talk-plan.md`

Use this structure. Keep it short enough to read in a few minutes.

```markdown
# <Talk title>

## Overview

- **Topic:** <topic>
- **Audience:** <who> (<beginner | intermediate | advanced>)
- **Length:** <n> minutes (<n> minutes Q&A)
- **Format:** <conference talk | meetup | workshop | internal demo | recording>
- **Abstract:** <one paragraph>
- **Material:** <links, repository, files>

## Key messages

1. <message>

## Story

<Two to four sentences: the hook, the tension, the resolution.>

## Agenda

| #   | Section | Minutes | Slides | Live demo |
| --- | ------- | ------- | ------ | --------- |
| 1   | Intro   | 3       | 3      | -         |

## Sections

### 1. <Section title> (<n> min)

- **Key message:** <message>
- **Slides:** <what each slide shows, with a suggested layout>
- **Live demo:** <what is shown, in which files, the starting state and the end state> | none
- **Speaker notes:** <talking points, stories, transitions>
- **Fallback:** <what to show when the demo fails> | none

## Demo setup

- **Repository and files:** <paths>
- **Starting state:** <how to reset before presenting>
- **Tools:** <terminal commands, extensions, settings, accounts>

## Assumptions and open questions

- <assumption or question>
```

## 5. Hand over

Summarize the plan in a few lines and offer the next steps:

- **Slides:** the `demotime-slides` skill creates the slides and the moves that open them.
- **Live demos:** the `demotime-code-demo` skill scripts the demos as scenes and moves.
- **Theme:** the `demotime-slide-theme` skill creates a slide theme from a brand or a mood.

When those skills are not available, point to the Demo Time documentation at https://demotime.show/.
