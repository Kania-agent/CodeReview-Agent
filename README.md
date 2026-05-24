# CodeReview-Agent

A fully functional code review tool that analyzes JavaScript and Python code in the browser.

## Features

- **Paste & Review**: Paste JavaScript or Python code, click Review, get instant analysis
- **Detection Rules**:
  - `console.log` left in production code (warning)
  - `var` instead of `let`/`const` (error)
  - Missing semicolons in JavaScript (info)
  - Unused variable declarations (warning)
  - Long functions exceeding 50 lines (error)
  - No error handling (missing try/catch or try/except) (warning)
  - Magic numbers — numeric literals outside assignments (warning)
  - Nested ternary expressions (warning)
- **Severity Badges**: Each issue tagged as Error, Warning, or Info
- **Code Quality Score**: 0–100 score based on weighted issue penalties
- **Before/After Comparison**: Side-by-side diff showing original vs fixed code
- **Syntax Highlighted Output**: Code with inline annotations

## Usage

Open `index.html` in any modern browser. No build step or server required.

## Files

- `index.html` — Page structure
- `style.css` — Styling and layout
- `app.js` — All analysis logic (300+ lines)
- `README.md` — This file
