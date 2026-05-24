/**
 * CodeReview-Agent — Static analysis engine for JavaScript and Python
 */

(function () {
    "use strict";

    // ── DOM refs ──────────────────────────────────────────────
    const codeInput = document.getElementById("codeInput");
    const languageSelect = document.getElementById("languageSelect");
    const reviewBtn = document.getElementById("reviewBtn");
    const clearBtn = document.getElementById("clearBtn");
    const sampleBtn = document.getElementById("sampleBtn");
    const resultsSection = document.getElementById("resultsSection");
    const scoreFill = document.getElementById("scoreFill");
    const scoreValue = document.getElementById("scoreValue");
    const summaryStats = document.getElementById("summaryStats");
    const issueList = document.getElementById("issueList");
    const diffOriginal = document.getElementById("diffOriginal");
    const diffFixed = document.getElementById("diffFixed");

    // ── Tab switching ─────────────────────────────────────────
    document.querySelectorAll(".tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
            document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
            tab.classList.add("active");
            document.getElementById(tab.dataset.tab + "Panel").classList.add("active");
        });
    });

    // ── Sample code ───────────────────────────────────────────
    const SAMPLES = {
        javascript: `var API_KEY = "abc123";
var unusedCount = 0;

function processUserData(users, config) {
    console.log("processing", users.length);
    var results = [];
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        if (user.age > 18) {
            var status = user.active ? user.premium ? "premium-active" : "basic-active" : "inactive";
            var tax = user.salary * 0.13;
            var fee = user.salary > 50000 ? user.salary * 0.05 : 250;
            results.push({ name: user.name, status: status, tax: tax, fee: fee });
        }
    }
    console.log("done");
    return results;
}

function transform(data) {
    var x = data.map(d => d * 2);
    var y = x.filter(v => v > 10);
    var z = y.reduce((a, b) => a + b, 0);
    var w = z * 3.14159;
    var q = w / 2.54;
    var r = q + 100;
    var s = r - 50;
    var t = s * 0.75;
    var u = t + 999;
    var m = u / 42;
    var n = m * 17;
    var o = n + 3;
    var p = o - 1;
    return p
}`,
        python: `import os

MAX_RETRIES = 3
unused_flag = None

def process_data(items, threshold):
    print("Starting processing")
    result = []
    for item in items:
        if item["value"] > threshold:
            status = "active" if item["score"] > 0.5 else "high" if item["score"] > 0.8 else "low"
            tax = item["value"] * 0.13
            fee = item["value"] * 0.05 if item["value"] > 50000 else 250
            result.append({"name": item["name"], "status": status, "tax": tax, "fee": fee})
    print("Done processing")
    return result

def transform(data):
    x = [d * 2 for d in data]
    y = [v for v in x if v > 10]
    z = sum(y)
    w = z * 3.14159
    q = w / 2.54
    r = q + 100
    s = r - 50
    t = s * 0.75
    u = t + 999
    m = u / 42
    n = m * 17
    o = n + 3
    p = o - 1
    return p`
    };

    sampleBtn.addEventListener("click", () => {
        codeInput.value = SAMPLES[languageSelect.value];
    });
    clearBtn.addEventListener("click", () => {
        codeInput.value = "";
        resultsSection.classList.add("hidden");
    });

    // ── Analysis rules ────────────────────────────────────────

    /**
     * Each rule returns an array of { line, rule, severity, message }.
     * line can be a number or null.
     */

    function checkConsoleLog(lines, lang) {
        if (lang !== "javascript") return [];
        const issues = [];
        const re = /\bconsole\s*\.\s*(log|warn|error|debug|info)\s*\(/;
        lines.forEach((text, i) => {
            if (re.test(text) && !text.trim().startsWith("//")) {
                issues.push({
                    line: i + 1,
                    rule: "no-console",
                    severity: "warning",
                    message: "Remove console statement before shipping to production."
                });
            }
        });
        return issues;
    }

    function checkVarUsage(lines, lang) {
        if (lang !== "javascript") return [];
        const issues = [];
        const re = /\bvar\s+/;
        lines.forEach((text, i) => {
            if (re.test(text) && !text.trim().startsWith("//")) {
                issues.push({
                    line: i + 1,
                    rule: "no-var",
                    severity: "error",
                    message: "Use 'let' or 'const' instead of 'var' for block scoping."
                });
            }
        });
        return issues;
    }

    function checkPrintStatements(lines, lang) {
        if (lang !== "python") return [];
        const issues = [];
        const re = /\bprint\s*\(/;
        lines.forEach((text, i) => {
            if (re.test(text) && !text.trim().startsWith("#")) {
                issues.push({
                    line: i + 1,
                    rule: "no-print",
                    severity: "warning",
                    message: "Use logging module instead of print() for production code."
                });
            }
        });
        return issues;
    }

    function checkMissingSemicolons(lines, lang) {
        if (lang !== "javascript") return [];
        const issues = [];
        const skipRe = /^\s*($|}|{|\/\/|\/\*|\*|import |export |from |if\s*\(|else|for\s*\(|while\s*\(|switch\s*\(|case |default:|try|catch|finally|function|class|const |let |var )/;
        const endRe = /[;{},)\]]\s*$/;
        lines.forEach((text, i) => {
            const trimmed = text.trim();
            if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return;
            if (skipRe.test(trimmed)) return;
            if (!endRe.test(trimmed) && trimmed.length > 0) {
                issues.push({
                    line: i + 1,
                    rule: "missing-semicolon",
                    severity: "info",
                    message: "Statement may be missing a semicolon."
                });
            }
        });
        return issues;
    }

    function checkUnusedVariables(lines, lang) {
        const issues = [];
        const declRe = lang === "python"
            ? /^\s*([a-zA-Z_]\w*)\s*=\s*/
            : /^\s*(?:var|let|const)\s+([a-zA-Z_$]\w*)\s*[=;]/;
        const declared = [];
        lines.forEach((text, i) => {
            const m = text.match(declRe);
            if (m) {
                declared.push({ name: m[1], line: i + 1 });
            }
        });
        const fullCode = lines.join("\n");
        declared.forEach((d) => {
            // Count occurrences of the variable name as a whole word
            const useRe = new RegExp("\\b" + escapeRegex(d.name) + "\\b", "g");
            const matches = fullCode.match(useRe);
            if (!matches || matches.length <= 1) {
                issues.push({
                    line: d.line,
                    rule: "no-unused-vars",
                    severity: "warning",
                    message: `'${d.name}' is declared but never used.`
                });
            }
        });
        return issues;
    }

    function checkLongFunction(lines, lang) {
        const issues = [];
        const funcStartRe = lang === "python"
            ? /^\s*def\s+(\w+)\s*\(/
            : /^\s*(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\(.*?\)\s*=>))/;
        let funcName = null;
        let funcStart = -1;
        let braceDepth = 0;

        lines.forEach((text, i) => {
            const m = text.match(funcStartRe);
            if (m) {
                funcName = m[1] || m[2];
                funcStart = i;
                braceDepth = 0;
            }
            if (funcStart >= 0) {
                // For JS, track braces
                if (lang === "javascript") {
                    for (const ch of text) {
                        if (ch === "{") braceDepth++;
                        if (ch === "}") braceDepth--;
                    }
                    if (braceDepth <= 0 && i > funcStart) {
                        const len = i - funcStart + 1;
                        if (len > 50) {
                            issues.push({
                                line: funcStart + 1,
                                rule: "max-func-lines",
                                severity: "error",
                                message: `Function '${funcName}' is ${len} lines (max 50). Break it into smaller functions.`
                            });
                        }
                        funcStart = -1;
                    }
                }
                // For Python, detect dedent
                if (lang === "python") {
                    if (i > funcStart && /^\s*\S/.test(text)) {
                        const indent = text.match(/^(\s*)/)[1].length;
                        const funcIndent = lines[funcStart].match(/^(\s*)/)[1].length;
                        if (indent <= funcIndent && text.trim().length > 0) {
                            const len = i - funcStart;
                            if (len > 50) {
                                issues.push({
                                    line: funcStart + 1,
                                    rule: "max-func-lines",
                                    severity: "error",
                                    message: `Function '${funcName}' is ${len} lines (max 50). Break it into smaller functions.`
                                });
                            }
                            funcStart = -1;
                        }
                    }
                }
            }
        });
        // If function goes to end of file
        if (funcStart >= 0) {
            const len = lines.length - funcStart;
            if (len > 50) {
                issues.push({
                    line: funcStart + 1,
                    rule: "max-func-lines",
                    severity: "error",
                    message: `Function '${funcName}' is ${len} lines (max 50). Break it into smaller functions.`
                });
            }
        }
        return issues;
    }

    function checkNoErrorHandling(lines, lang) {
        const issues = [];
        const funcStartRe = lang === "python"
            ? /^\s*def\s+(\w+)\s*\(/
            : /^\s*(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\(.*?\)\s*=>))/;

        const funcStartRe2 = lang === "python"
            ? /^\s*def\s+(\w+)\s*\(/
            : /^\s*(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\(.*?\)\s*=>))/;

        let funcName = null;
        let funcStart = -1;
        let braceDepth = 0;
        let hasTryCatch = false;

        lines.forEach((text, i) => {
            const m = text.match(funcStartRe2);
            if (m) {
                // Check previous function
                if (funcStart >= 0 && !hasTryCatch) {
                    issues.push({
                        line: funcStart + 1,
                        rule: "require-error-handling",
                        severity: "warning",
                        message: `Function '${funcName}' has no try/catch error handling.`
                    });
                }
                funcName = m[1] || m[2];
                funcStart = i;
                braceDepth = 0;
                hasTryCatch = false;
            }
            if (funcStart >= 0) {
                if (/\b(try|except|catch|finally)\b/.test(text)) hasTryCatch = true;
                if (lang === "javascript") {
                    for (const ch of text) {
                        if (ch === "{") braceDepth++;
                        if (ch === "}") braceDepth--;
                    }
                    if (braceDepth <= 0 && i > funcStart) {
                        if (!hasTryCatch) {
                            issues.push({
                                line: funcStart + 1,
                                rule: "require-error-handling",
                                severity: "warning",
                                message: `Function '${funcName}' has no try/catch error handling.`
                            });
                        }
                        funcStart = -1;
                    }
                }
                if (lang === "python" && i > funcStart && /^\s*\S/.test(text)) {
                    const indent = text.match(/^(\s*)/)[1].length;
                    const funcIndent = lines[funcStart].match(/^(\s*)/)[1].length;
                    if (indent <= funcIndent && text.trim().length > 0) {
                        if (!hasTryCatch) {
                            issues.push({
                                line: funcStart + 1,
                                rule: "require-error-handling",
                                severity: "warning",
                                message: `Function '${funcName}' has no try/except error handling.`
                            });
                        }
                        funcStart = -1;
                    }
                }
            }
        });
        // Last function
        if (funcStart >= 0 && !hasTryCatch) {
            issues.push({
                line: funcStart + 1,
                rule: "require-error-handling",
                severity: "warning",
                message: `Function '${funcName}' has no error handling.`
            });
        }
        return issues;
    }

    function checkMagicNumbers(lines, lang) {
        const issues = [];
        const magicRe = /(?<![.\w])(\d+\.?\d*)(?!\w*[:(])/g;
        const allowed = new Set(["0", "1", "2", "-1", "100"]);
        lines.forEach((text, i) => {
            if (text.trim().startsWith("//") || text.trim().startsWith("#")) return;
            // Skip lines that look like assignments to named constants
            if (/^\s*(?:const|let|var|MAX|MIN|[A-Z_]{2,})\s*=\s*\d/.test(text)) return;
            let m;
            while ((m = magicRe.exec(text)) !== null) {
                const num = m[1];
                if (allowed.has(num)) continue;
                // Check if it's part of a decimal import or version
                if (text[m.index - 1] === "." || text[m.index + num.length] === ".") continue;
                // Must be standalone
                const before = m.index > 0 ? text[m.index - 1] : " ";
                if (/\w/.test(before) && before !== " ") continue;
                issues.push({
                    line: i + 1,
                    rule: "no-magic-numbers",
                    severity: "warning",
                    message: `Magic number ${num} — extract to a named constant.`
                });
                break; // one per line
            }
        });
        return issues;
    }

    function checkNestedTernaries(lines, lang) {
        const issues = [];
        const ternaryRe = /\?[^:]*\?/;
        lines.forEach((text, i) => {
            if (ternaryRe.test(text) && !text.trim().startsWith("//") && !text.trim().startsWith("#")) {
                issues.push({
                    line: i + 1,
                    rule: "no-nested-ternary",
                    severity: "warning",
                    message: "Nested ternary expression — use if/else for readability."
                });
            }
        });
        return issues;
    }

    // ── Auto-fixer ────────────────────────────────────────────

    function autoFix(lines, issues, lang) {
        const fixed = lines.slice();
        const issueRules = new Map();
        issues.forEach((iss) => {
            if (!issueRules.has(iss.line)) issueRules.set(iss.line, []);
            issueRules.get(iss.line).push(iss.rule);
        });

        for (let i = 0; i < fixed.length; i++) {
            const rules = issueRules.get(i + 1) || [];

            // Fix var -> const
            if (rules.includes("no-var") && lang === "javascript") {
                fixed[i] = fixed[i].replace(/\bvar\b/, "const");
            }

            // Remove console.log
            if (rules.includes("no-console") && lang === "javascript") {
                fixed[i] = fixed[i].replace(/\s*console\s*\.\s*\w+\s*\([^)]*\)\s*;?/, "");
            }

            // Remove print()
            if (rules.includes("no-print") && lang === "python") {
                fixed[i] = fixed[i].replace(/\s*print\s*\([^)]*\)\s*/, "");
            }

            // Add semicolons
            if (rules.includes("missing-semicolon") && lang === "javascript") {
                const trimmed = fixed[i].trimEnd();
                if (trimmed.length > 0) {
                    fixed[i] = trimmed + ";";
                }
            }
        }

        // Remove unused variable lines entirely
        issues.filter((iss) => iss.rule === "no-unused-vars").forEach((iss) => {
            const idx = iss.line - 1;
            if (idx >= 0 && idx < fixed.length) {
                fixed[idx] = null; // mark for removal
            }
        });

        return fixed.filter((l) => l !== null);
    }

    // ── Utility ───────────────────────────────────────────────

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function calculateScore(issues) {
        let score = 100;
        issues.forEach((iss) => {
            if (iss.severity === "error") score -= 8;
            else if (iss.severity === "warning") score -= 4;
            else score -= 1;
        });
        return Math.max(0, Math.min(100, score));
    }

    function scoreColor(score) {
        if (score >= 80) return "#3fb950";
        if (score >= 50) return "#d29922";
        return "#f85149";
    }

    // ── Render ────────────────────────────────────────────────

    function render(issues, score, originalLines, fixedLines) {
        resultsSection.classList.remove("hidden");

        // Score
        scoreFill.style.width = score + "%";
        scoreFill.style.background = scoreColor(score);
        scoreValue.textContent = score;
        scoreValue.style.color = scoreColor(score);

        // Summary
        const counts = { error: 0, warning: 0, info: 0 };
        issues.forEach((i) => counts[i.severity]++);
        summaryStats.innerHTML = `
            <span class="stat-badge stat-error">${counts.error} Errors</span>
            <span class="stat-badge stat-warning">${counts.warning} Warnings</span>
            <span class="stat-badge stat-info">${counts.info} Info</span>
        `;

        // Issues
        issueList.innerHTML = issues.length === 0
            ? '<p style="color:#3fb950;font-weight:600;">✅ No issues found — great code!</p>'
            : "";
        issues.forEach((iss) => {
            const card = document.createElement("div");
            card.className = `issue-card severity-${iss.severity}`;
            card.innerHTML = `
                <div class="issue-header">
                    <span class="severity-badge ${iss.severity}">${iss.severity}</span>
                    <span class="issue-rule">${iss.rule}</span>
                    <span class="issue-line">Line ${iss.line}</span>
                </div>
                <div class="issue-message">${iss.message}</div>
            `;
            issueList.appendChild(card);
        });

        // Diff
        diffOriginal.textContent = originalLines.join("\n");
        diffFixed.textContent = fixedLines.join("\n");
    }

    // ── Main action ───────────────────────────────────────────

    reviewBtn.addEventListener("click", () => {
        const code = codeInput.value.trim();
        if (!code) {
            alert("Please paste some code first.");
            return;
        }
        const lang = languageSelect.value;
        const lines = code.split("\n");

        // Run all checks
        const allIssues = [
            ...checkConsoleLog(lines, lang),
            ...checkVarUsage(lines, lang),
            ...checkPrintStatements(lines, lang),
            ...checkMissingSemicolons(lines, lang),
            ...checkUnusedVariables(lines, lang),
            ...checkLongFunction(lines, lang),
            ...checkNoErrorHandling(lines, lang),
            ...checkMagicNumbers(lines, lang),
            ...checkNestedTernaries(lines, lang)
        ];

        // Sort by line number then severity
        const sevOrder = { error: 0, warning: 1, info: 2 };
        allIssues.sort((a, b) => a.line - b.line || sevOrder[a.severity] - sevOrder[b.severity]);

        const score = calculateScore(allIssues);
        const fixedLines = autoFix(lines, allIssues, lang);
        render(allIssues, score, lines, fixedLines);

        resultsSection.scrollIntoView({ behavior: "smooth" });
    });

})();
