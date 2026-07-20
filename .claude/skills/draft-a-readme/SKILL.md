---
name: draft-a-readme
description: This skill can only be triggered through the slash command call—`/draft-a-readme`. This skill writes a README file from scratch in the root directory of a project given a project's context, skill instructions, and a followable workflow.
---

# Task

Write a `README.md` in the project's root directory that reproduces the exact structure, formatting mechanics, and voice of [references/reference-README.md](references/reference-README.md), with every fact drawn from the actual project.

**The reference is the format oracle.** If anything in this file ever appears to disagree with the reference, the reference wins.

# Workflow

1. Get the current `README.md` from the project root.
    - If it is empty or does not exist, proceed.
    - If it has content, prompt the user to view it and decide whether to overwrite it. Stop if they decline.
2. Read [references/reference-README.md](references/reference-README.md) in full to internalize the format.
3. Read the local repository to understand the project: its manifest/dependency file, entry points, source modules, configuration constants, `LICENSE`, git history (for authors), and any existing docs. Prefer reading source over guessing.
4. Draft `README.md` in the project root by filling the Skeleton below, applying the Exact Mechanics and Section Contents rules.
5. Run the Verification Checklist against the drafted file and fix any miss before finishing.

# Skeleton

Fill every `<placeholder>`; keep all literal characters, indentation, and blank lines exactly as shown. `⋮` marks where a pattern repeats.

````markdown
<div align="center">

   # <Project Title>
   <One-sentence description of the project and its contextualized purpose.>

   ![<Language>](https://img.shields.io/badge/<Language>-<version>-<brandHex>?style=for-the-badge&logo=<slug>&logoColor=white)
   ![<Dependency>](https://img.shields.io/badge/<Dependency>-%E2%89%A5<version>-<brandHex>?style=for-the-badge&logo=<slug>&logoColor=white)
   ⋮ (one badge per manifest dependency)
   ![License](https://img.shields.io/badge/License-<Name>-green?style=for-the-badge)
   ![Build](https://img.shields.io/badge/Build-<status>-informational?style=for-the-badge)

   <1–2 sentence blurb: the project name's origin or the framing/story behind it.>

</div>

---



## I - Table of Contents
- [II - Features](#ii--features)
- [III - Demonstration](#iii--demonstration)
- [IV - Quick Start](#iv--quick-start)
- [V - Installation](#v--installation)
- [VI - Usage](#vi--usage)
- [VII - Configuration](#vii--configuration)
- [VIII - Reference](#viii--reference)
- [IX - License](#ix--license)
- [X - Authors](#x--authors)
- [XI - Contact](#xi--contact)

<br>



## II - Features
- **<Capability>**: <one-line explanation grounded in the actual source.>
⋮

<br>



## III - Demonstration
<One line of prose tying the block below to what produces it:>

```text
<representative console output / log / artifact>
```
⋮

<br>



## IV - Quick Start
```<shell>
# 1. <step>
<command>
⋮
```

**Note**: <destructive, long-running, or surprising behavior of the steps above, if any.>

<br>



## V - Installation
### Requirements
- **<Runtime/language + version>**

### Dependencies
Pinned in [./<manifest>](<manifest>):

| Library | Version | Role |
|---------|---------|------|
| `<name>` | `<constraint>` | <what it is used for> |
⋮

### Steps
```<shell>
# 1. Clone the repository and move into it
<clone + cd>

# 2. <environment setup>
⋮

# 3. Install all required dependencies
<install command>
```

<br>



## VI - Usage
All commands run from the **repository root** <plus any environment precondition>.

### <Task name>
<One sentence on what it does / where output goes:>

```<shell or language>
<exact command or snippet>
```
⋮ (one `###` subsection per common task)

<br>



## VII - Configuration
<Where the settings live, linking the file as [./<path>](<path>):>

| Constant | Default | Meaning |
|----------|---------|---------|
| `<name>` | `<value>` | <what it controls> |
⋮ (one table per settings group, each introduced by a prose line)

<br>



## VIII - Reference
### Project layout
```text
<root>/
├─ <dir>/                        # <annotation>
│  ├─ <file>                     # <annotation>
│  └─ <dir>/
└─ <file>                        # <annotation>
```

### Key entry points
- **`<symbol or file>`**: <what it does and why it matters.>
⋮

### <Topic> at a glance
1. <numbered step of how the project works end-to-end>
⋮

### External
- [<resource>](<url>): <what the project uses it for.>

<br>



## IX - License
<License statement; see Section Contents.>

<br>



## X - Authors
- **<name>**: <role> ([github.com/<user>](https://github.com/<user>))

<br>



## XI - Contact
- **Repository**: [github.com/<user>/<repo>](https://github.com/<user>/<repo>)
- **Issues**: please open a [GitHub issue](https://github.com/<user>/<repo>/issues) for bugs, questions, or feature requests

<br>

---

*Last Updated: <Month D, YYYY>*
````

# Exact Mechanics

- **Header block**: every line inside the `<div align="center">` is indented exactly 3 spaces; the description sits on the line directly under the H1 with no blank between.
- **Section numbering**: `## <NUMERAL> - <Title>` using ASCII roman numerals (`I`, `II`, … `XI` — plain letters I/V/X). Never Unicode roman-numeral characters (`Ⅰ`, `Ⅱ`, …) and never `•` — Unicode numerals break GitHub anchor links.
- **Anchors**: lowercase the header, ` - ` becomes `--`, remaining spaces become `-`. Examples: `II - Features` → `#ii--features`; `IV - Quick Start` → `#iv--quick-start`.
- **Section breaks**: after each section's last line — one blank line, `<br>`, three blank lines, then the next `##` header. The header block instead ends with: `</div>`, one blank line, `---`, three blank lines, `## I - Table of Contents`.
- **Footer**: after section XI — one blank line, `<br>`, one blank line, `---`, one blank line, `*Last Updated: <Month D, YYYY>*` (full month name, today's date), then end of file.
- **Badges**: `style=for-the-badge` on all; add `&logo=<simple-icons slug>&logoColor=white` (or `black` on light badge colors) when a logo exists. URL-encode values: space → `%20`, `≥` → `%E2%89%A5`. Order: language/runtime version first, then one badge per manifest dependency in manifest order, then License, then Build.
- **Shell blocks**: use the platform-appropriate fence language (`powershell` on Windows projects, `bash` otherwise) with `# 1.`-style numbered comments; output/log blocks use `text`; data uses its own language tag.
- **File links**: display path with a `./` prefix, target without it — `[./src/main.py](src/main.py)`.

# Section Contents

- **Header** — H1 title; 1–2 sentence purpose; badges; a short blurb giving the name's origin or the project's framing.
- **II - Features** — one bullet per notable capability: bold name, colon, one line grounded in source (link files where natural).
- **III - Demonstration** — what running the project looks like: representative console output, artifacts, or data samples in fenced blocks, each tied to its producer by a line of prose.
- **IV - Quick Start** — the shortest path from clone to a working run as a single annotated block; call out destructive or long-running steps in the `**Note**`.
- **V - Installation** — `### Requirements` (runtime/language version), `### Dependencies` (table from the manifest), `### Steps` (clone, environment, install).
- **VI - Usage** — where commands run from, then one `###` per common task with the exact command and a sentence on what it does.
- **VII - Configuration** — tables of the real tunable constants/settings (name, default, meaning) with a link to the file each lives in.
- **VIII - Reference** — annotated project tree (`├─ │ └─` style), key entry points, a numbered "at a glance" walkthrough, external resources.
- **IX - License** — state the license from a `LICENSE` file if present (link it, summarize the granted rights in one sentence); otherwise say none is distributed and all rights are reserved.
- **X - Authors** — authors/maintainers with profile links, derived from git history or the manifest.
- **XI - Contact** — repository link and where to report issues; add an email bullet only if the project publishes one.

# Verification Checklist

Before finishing, run the structural checker and fix every reported miss until it prints `PASS`:

```powershell
python <this skill's directory>\scripts\verify-format.py <project root>\README.md
```

Then confirm the judgment-only checks the script cannot cover:

- [ ] Every fact (names, versions, paths, commands, constants) traces to this project's files — nothing carried over from the reference example.
- [ ] Every file link and command in the README resolves against the actual repository.
- [ ] Badge order is language/runtime → dependencies in manifest order → License → Build.

# Never Do

- Never make up content.
- Never abbreviate a term without first stating what it stands for.
- Never copy facts, names, versions, or paths from the reference example into the output unless it's truth.
- Never overwrite a non-empty `README.md` without explicit user confirmation.
- Never put spaces between em-dashes (e.g., "This is an em-dash—a piece of punctuation.") unless it's used in place of colon to denote listings.
