# 🤖 CodeReview Agent

> AI-powered pull request code review that catches bugs humans miss — powered by MiMo V2.5

## Why This Exists

Code review is the single most effective practice for catching bugs before they reach production, yet most teams treat it as a bottleneck. Senior engineers spend hours each week reading diffs, writing comments, and explaining the same anti-patterns to junior contributors. Meanwhile, critical issues slip through because fatigue sets in after the third PR in a row, or because the reviewer lacks deep context in a particular subsystem.

CodeReview Agent eliminates this bottleneck by deploying MiMo V2.5 — Nous Research's code analysis model — as an tireless, always-available reviewer that reads every diff with equal attention to detail. It doesn't just lint your code or check formatting; it understands intent, traces data flow, and identifies logical errors, security vulnerabilities, performance regressions, and API contract violations with the depth of a senior engineer.

The system integrates directly with GitHub's API to post inline review comments with severity badges — Critical, Warning, Info, and Suggestion — so teams can triage findings the same way they triage any other work item. Whether you run a two-person startup or a 200-engineer organization, CodeReview Agent ensures every PR gets a thorough, consistent, bias-free review in minutes instead of hours.

## Architecture

```
┌───────────────┐
│   PR Diff     │   Git unified diff or GitHub PR webhook
│  (Incoming)   │   payload with changed files
└───────┬───────┘
        │
        ▼
┌───────────────┐
│    Parser      │   Extracts file context, function boundaries,
│  (Diff Engine) │   dependency graph, and language metadata
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Review Agent   │   MiMo V2.5 — semantic analysis, logic errors,
│ (MiMo V2.5)   │   security flaws, performance issues, style
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   Comment      │   Severity classification, suggestion drafting,
│  Generator     │   code fix generation, reference linking
│ (MiMo V2.5)   │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  GitHub API    │   Posts inline review comments, PR approval
│  (Integration) │   or request-changes verdict, summary notes
└───────────────┘
```

## Token Consumption Model

| Agent | Tokens/Op | Frequency | Daily/User (est.) |
|-------|-----------|-----------|-------------------|
| Diff Parser | 100K | ~8 reviews/day | 800K |
| Review Agent | 800K | ~8 reviews/day | 6.4M |
| Comment Generator | 200K | ~8 reviews/day | 1.6M |
| **Total** | **1.1M** | — | **~8.8M** |

> Token estimates based on average PR size of 300 changed lines across 5 files.

## Features

- 📝 **Inline diff comments** — Severity-tagged annotations appear directly on the relevant lines of code
- 🔴🟡🔵 **Severity badges** — Critical, Warning, Info, and Suggestion badges for easy triage
- 🌳 **File tree navigation** — Browse changed files in a sidebar with change counts and status indicators
- 🔐 **Security-focused analysis** — Detects injection flaws, auth bypasses, secret leaks, and unsafe deserialization
- ⚡ **Performance regression detection** — Flags O(n²) loops, unnecessary allocations, and N+1 query patterns
- 📊 **Review summary statistics** — Dashboard view of findings by severity, category, and file
- 🔄 **GitHub webhook integration** — Automatically reviews PRs on open, push, or request-review events
- 💡 **Auto-generated fix suggestions** — Not just "this is wrong" but "here's the corrected code"
- 🧩 **Language-agnostic** — Works with Python, JavaScript/TypeScript, Go, Rust, Java, and Solidity

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+)
- **AI Engine:** MiMo V2.5 by Nous Research
- **Integration:** GitHub REST API & Webhooks
- **Architecture:** Zero-dependency — no build step, no frameworks, no node_modules
- **Syntax Highlighting:** Custom tokenizer with language-specific grammars

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/CodeReview-Agent.git
cd CodeReview-Agent

# Open the review dashboard
open index.html

# Or serve locally
python3 -m http.server 8080
```

1. Open `index.html` in your browser
2. Browse the sample PR with syntax-highlighted diffs
3. Click inline review comments to see severity, explanation, and suggested fix
4. Check the summary panel for aggregate statistics across all findings
5. To connect your own repo, configure your GitHub token in `js/config.js`

## Project Structure

```
CodeReview-Agent/
├── index.html                # Review dashboard entry point
├── css/
│   ├── main.css              # Core theme and layout
│   ├── diff-viewer.css       # Diff highlighting and line styles
│   └── comments.css          # Inline comment popover styles
├── js/
│   ├── app.js                # Main application controller
│   ├── parser.js             # Diff parsing and file tree builder
│   ├── review-agent.js       # MiMo V2.5 review orchestration
│   ├── comment-gen.js        # Comment formatting and posting
│   └── config.js             # GitHub API configuration
├── data/
│   ├── sample-prs/           # Example PR diffs for demo
│   └── review-rules/         # Customizable review rule definitions
├── assets/
│   └── icons/                # Status and severity icons
└── README.md
```

---

> Built with MiMo V2.5 — [Nous Research](https://nousresearch.com)
