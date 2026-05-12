# Slides Discovery Interview

Use this reference when the user wants new slides, a major rewrite, or a deck generated from loose notes.

The goal is to collect enough context to produce a strong first draft without turning the interaction into a long intake form.

## Principles

- Ask only for information that materially changes the deck.
- Prefer one compact batch of questions over a long back-and-forth.
- If the user already provided enough detail, do not re-ask it.
- Prioritize content and audience before aesthetics.
- Stop after 1 to 2 rounds of questions. Then proceed with reasonable defaults and state them.
- Summarize the brief back to yourself before generating.

## What Good Context Looks Like

A usable slide brief usually covers:

- Deck goal: what this presentation needs to achieve.
- Audience: who will see it and what they already know.
- Core message: the one idea the audience should remember.
- Source material: notes, docs, screenshots, data, or existing slides.
- Scope: rough slide count, talk length, or required sections.
- Tone: formal, bold, calm, technical, investor-friendly, internal, etc.
- Visual direction: brand rules, examples to emulate, examples to avoid.
- Constraints: deadline, format, aspect ratio, must-include content, legal or approval limits.

## Question Priorities

Ask in this order. If the earlier group is missing, do not start with visual preferences.

### Group 1: Required for almost every deck

Ask for:

- What is this deck for?
- Who is the audience?
- What should the audience understand, believe, or do after seeing it?
- What source material already exists?

Suggested wording:

```text
Before I draft the slides, I need a quick brief:
1. What is this deck for?
2. Who is the audience, and how familiar are they with the topic?
3. What is the single most important takeaway or action?
4. What source material should I use: notes, docs, screenshots, data, existing slides?
```

### Group 2: Usually needed for structure

Ask for:

- How long should the presentation be, or how many slides should it roughly have?
- Are there required sections or must-cover points?
- Should the deck tell a story, teach, persuade, report status, or support discussion?
- What language should the slides use?

Suggested wording:

```text
To shape the outline:
5. Roughly how long should this be: talk length or slide count?
6. Are there required sections or points that must appear?
7. Is this primarily a pitch, explanation, status update, decision memo, or workshop aid?
8. What language should the slides use?
```

### Group 3: Needed when visual direction matters

Ask for:

- What tone or feeling should the deck create?
- Are there brand colors, fonts, logos, or style rules?
- Are there reference decks or products to match or avoid?
- Should visuals be minimal, editorial, product-heavy, chart-heavy, or image-led?

Suggested wording:

```text
For visual direction:
9. What tone should the deck convey: polished, bold, calm, premium, technical, playful, etc.?
10. Do you have brand assets or style rules I should follow?
11. Any examples to emulate or avoid?
12. Should this lean more toward product visuals, diagrams, charts, or text-led storytelling?
```

### Group 4: Delivery and production constraints

Ask only when relevant:

- Does the deck need to stay easy to edit later?
- Does it need speaker notes, hidden slides, or appendix slides?
- Is there a target aspect ratio or environment?
- Is there a deadline or review checkpoint?

Suggested wording:

```text
Last production details, if they matter here:
13. Does this need to stay easy to edit after generation?
14. Do you need speaker notes, hidden slides, or an appendix?
15. Any delivery constraints like 16:9, kiosk display, PDF export, or deadline?
```

## Adaptive Flows

Use a shorter path when the user's prompt already implies the shape of the work.

### If the user only gives a topic

Ask Group 1 and Group 2 first. Defer design questions unless the user asks for a specific look.

### If the user gives full content but weak style direction

Confirm audience, goal, slide count, and tone. Then proceed with a default visual direction that fits the audience.

### If the user mostly cares about look and feel

Still anchor on audience and outcome first. A visually strong deck with the wrong message is a miss.

### If the user provides an existing deck

Ask what must stay, what can change, and what outcome is missing from the current version.

## Default Assumptions

If the user does not answer everything but the brief is workable, proceed with explicit defaults such as:

- Audience knowledge: mixed or moderately familiar.
- Deck length: 6 to 10 slides for a short briefing, 10 to 15 for a fuller narrative.
- Tone: clear, confident, and presentation-appropriate for the audience.
- Structure: title, context, key points, evidence, takeaway, next step.
- Visual density: one main idea per slide, avoid cramming.

## Output Format For Yourself

Before generating, compress the answers into a short internal brief:

```text
Deck brief
- Goal:
- Audience:
- Core takeaway:
- Source material:
- Scope:
- Required sections:
- Tone:
- Visual direction:
- Constraints:
- Assumptions:
```

If key information is missing, include it under `Assumptions` rather than blocking progress.

## What To Avoid

- Do not ask fifteen low-value questions when four would unlock the work.
- Do not ask about colors before understanding the audience and objective.
- Do not force the user to describe design vocabulary they may not have.
- Do not repeat questions answered in the prompt or attachments.
- Do not refuse to start just because some optional detail is unknown.
