// CodeReview Agent — app.js

const fileDiffs = [
    // File 0: src/auth/login.ts
    [
        { num: 1, type: 'context', code: "import { AuthService } from './auth.service';" },
        { num: 2, type: 'context', code: "import { User } from '../models/user';" },
        { num: 3, type: 'removed', code: "import * as crypto from 'crypto';" },
        { num: 4, type: 'added', code: "import bcrypt from 'bcrypt';", review: 'suggestion', reviewText: 'Consider adding bcrypt version pinning to package.json for reproducibility.' },
        { num: 5, type: 'context', code: '' },
        { num: 6, type: 'context', code: "export class LoginHandler {" },
        { num: 7, type: 'context', code: "  private authService: AuthService;" },
        { num: 8, type: 'context', code: '' },
        { num: 9, type: 'removed', code: "  async login(email: string, password: string): Promise<User> {" },
        { num: 10, type: 'removed', code: "    const user = await this.authService.findByEmail(email);" },
        { num: 11, type: 'removed', code: "    const hash = crypto.createHash('sha256')" },
        { num: 12, type: 'removed', code: "      .update(password).digest('hex');" },
        { num: 13, type: 'removed', code: "    if (hash !== user.passwordHash) {" },
        { num: 14, type: 'removed', code: "      throw new Error('Invalid credentials');" },
        { num: 15, type: 'removed', code: "    }" },
        { num: 16, type: 'removed', code: "    return user;" },
        { num: 17, type: 'removed', code: "  }" },
        { num: 18, type: 'added', code: "  async login(email: string, password: string): Promise<User> {", review: 'critical', reviewText: 'SHA-256 without salt is NOT suitable for password hashing. Use bcrypt/argon2 instead.' },
        { num: 19, type: 'added', code: "    const user = await this.authService.findByEmail(email);" },
        { num: 20, type: 'added', code: "    if (!user) {" },
        { num: 21, type: 'added', code: "      throw new AuthError('User not found');" },
        { num: 22, type: 'added', code: "    }" },
        { num: 23, type: 'added', code: "    const isValid = await bcrypt.compare(password, user.passwordHash);" },
        { num: 24, type: 'added', code: "    if (!isValid) {" },
        { num: 25, type: 'added', code: "      throw new AuthError('Invalid credentials');" },
        { num: 26, type: 'added', code: "    }" },
        { num: 27, type: 'added', code: "    const token = this.generateToken(user);" },
        { num: 28, type: 'added', code: "    await this.logLoginAttempt(user.id, true);", review: 'warning', reviewText: 'Ensure <code>logLoginAttempt</code> has rate limiting to prevent log flooding attacks.' },
        { num: 29, type: 'added', code: "    return { ...user, token };" },
        { num: 30, type: 'added', code: "  }" },
        { num: 31, type: 'context', code: '' },
        { num: 32, type: 'context', code: "}" },
    ],
    // File 1: src/utils/crypto.ts
    [
        { num: 1, type: 'context', code: "import { createCipheriv, createDecipheriv } from 'crypto';" },
        { num: 2, type: 'removed', code: "const ALGORITHM = 'aes-256-ecb';" },
        { num: 3, type: 'added', code: "const ALGORITHM = 'aes-256-gcm';", review: 'critical', reviewText: 'ECB mode leaks patterns — good switch to GCM. Ensure IV is unique per encryption.' },
        { num: 4, type: 'added', code: "const IV_LENGTH = 12;" },
        { num: 5, type: 'context', code: '' },
        { num: 6, type: 'context', code: "export function encrypt(data: string, key: Buffer): string {" },
        { num: 7, type: 'added', code: "  const iv = randomBytes(IV_LENGTH);" },
        { num: 8, type: 'added', code: "  const cipher = createCipheriv(ALGORITHM, key, iv);" },
        { num: 9, type: 'context', code: "  let encrypted = cipher.update(data, 'utf8', 'hex');" },
        { num: 10, type: 'context', code: "  encrypted += cipher.final('hex');" },
        { num: 11, type: 'added', code: "  const authTag = cipher.getAuthTag();" },
        { num: 12, type: 'added', code: "  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;" },
        { num: 13, type: 'context', code: "}" },
    ],
];

const reviewComments = [
    {
        severity: 'critical',
        author: 'MiMo V2.5 AI',
        line: 'L3-17',
        body: 'SHA-256 password hashing is cryptographically broken for this use case. <code>crypto.createHash("sha256")</code> without salt is vulnerable to rainbow table and brute-force attacks. The fix to bcrypt is correct.',
        time: '2 min ago'
    },
    {
        severity: 'warning',
        author: 'MiMo V2.5 AI',
        line: 'L28',
        body: 'The <code>logLoginAttempt</code> function should include rate-limiting. Without it, an attacker can flood logs. Consider implementing a sliding window counter.',
        time: '2 min ago'
    },
    {
        severity: 'suggestion',
        author: 'MiMo V2.5 AI',
        line: 'L4',
        body: 'Pinning the bcrypt version in package.json ensures reproducible builds. Also consider using a cost factor of 12+ for current hardware.',
        time: '1 min ago'
    },
];

function renderDiff(fileIndex) {
    const container = document.getElementById('diffContainer');
    const diff = fileDiffs[fileIndex] || fileDiffs[0];
    
    container.innerHTML = diff.map(line => {
        const marker = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
        const reviewHtml = line.review 
            ? `<span class="review-indicator ${line.review}">${line.review === 'critical' ? '⚠ CRIT' : line.review === 'warning' ? '⚡ WARN' : '💡 TIP'}</span>` 
            : '';
        return `<div class="diff-line ${line.type}">
            <span class="line-num">${line.num}</span>
            <span class="diff-marker">${marker}</span>
            <span class="line-content">${escapeHtml(line.code)}</span>
            ${reviewHtml}
        </div>`;
    }).join('');
}

function renderComments() {
    const list = document.getElementById('commentsList');
    list.innerHTML = reviewComments.map(c => `
        <div class="comment-card">
            <div class="comment-header">
                <span class="comment-author" style="color:${c.severity === 'critical' ? '#f38ba8' : c.severity === 'warning' ? '#f9e2af' : '#89b4fa'}">${c.author}</span>
                <span class="comment-line-ref">${c.line}</span>
            </div>
            <span class="comment-severity ${c.severity}">${c.severity}</span>
            <div class="comment-body">${c.body}</div>
            <div style="margin-top:6px;font-size:10px;color:#6c7086">${c.time}</div>
        </div>
    `).join('');
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener('DOMContentLoaded', () => {
    renderDiff(0);
    renderComments();

    // File tree navigation
    document.querySelectorAll('.tree-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.tree-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            renderDiff(parseInt(item.dataset.file));
        });
    });

    // Add comment
    document.getElementById('addCommentBtn').addEventListener('click', () => {
        const input = document.getElementById('commentInput');
        const text = input.value.trim();
        if (!text) return;
        reviewComments.push({
            severity: 'suggestion',
            author: 'You',
            line: 'L-',
            body: escapeHtml(text),
            time: 'Just now'
        });
        renderComments();
        input.value = '';
    });

    // Approve button
    document.getElementById('approveBtn').addEventListener('click', function() {
        this.textContent = '✓ Approved!';
        this.style.background = '#2ed573';
        setTimeout(() => {
            this.textContent = '✓ Approve';
            this.style.background = '';
        }, 2000);
    });
});
