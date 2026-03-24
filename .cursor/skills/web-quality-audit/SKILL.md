---
name: web-quality-audit
description: Comprehensive web quality audit covering performance, accessibility, SEO, and best practices in a single review. Use when asked to "audit my site", "review web quality", "run lighthouse audit", "check page quality", or "optimize my website" across multiple areas at once. Orchestrates specialized skills for depth. Do NOT use for single-area audits — prefer core-web-vitals, web-accessibility, seo, or web-best-practices for focused work.
license: MIT
metadata:
  author: web-quality-skills
  version: '1.0'
---

# Web quality audit

Comprehensive quality review based on Google Lighthouse audits. Covers Performance, Accessibility, SEO, and Best Practices across 150+ checks.

## How it works

1. Analyze the provided code/project for quality issues
2. Categorize findings by severity (Critical, High, Medium, Low)
3. Provide specific, actionable recommendations
4. Include code examples for fixes

## Audit categories

### Performance (40% of typical issues)

**Core Web Vitals** — Must pass for good page experience:
- **LCP (Largest Contentful Paint) < 2.5s.**
- **INP (Interaction to Next Paint) < 200ms.**
- **CLS (Cumulative Layout Shift) < 0.1.**

**Resource Optimization:**
- Compress images — WebP/AVIF with fallbacks. Serve correctly sized via `srcset`.
- Minimize JavaScript — code splitting, defer non-critical scripts.
- Optimize CSS — extract critical CSS, remove unused styles.
- Efficient fonts — `font-display: swap`, preload critical fonts.

### Accessibility (30% of typical issues)

**Perceivable:**
- Text alternatives on all `<img>` elements.
- Color contrast minimum 4.5:1 for normal text, 3:1 for large text (WCAG AA).
- Don't rely on color alone.

**Operable:**
- Keyboard accessible — no keyboard traps.
- Focus visible on all interactive elements.
- Skip links for keyboard users.

**Understandable:**
- Page language set (`lang` attribute on `<html>`).
- Form errors clearly described and associated with fields.
- All form inputs have associated labels.

**Robust:**
- Valid HTML — no duplicate IDs, properly nested elements.
- ARIA used correctly — prefer native elements.

### SEO (15% of typical issues)

- Unique title tags (50-60 chars) and meta descriptions (150-160 chars).
- Single `<h1>`. Logical heading structure.
- Mobile-friendly. Tap targets ≥ 48px.
- Structured data (JSON-LD).

### Best practices (15% of typical issues)

- No vulnerable libraries (check npm audit).
- CSP headers to prevent XSS.
- No exposed source maps in production.
- No deprecated APIs.
- Clean console — no CORS issues.

## Severity levels

| Level | Description | Action |
| ------------ | --------------------------------------------- | ------------------- |
| **Critical** | Security vulnerabilities, complete failures | Fix immediately |
| **High** | Core Web Vitals failures, major a11y barriers | Fix before launch |
| **Medium** | Performance opportunities, SEO improvements | Fix within sprint |
| **Low** | Minor optimizations, code quality | Fix when convenient |

## Audit output format

```markdown
## Audit results

### Critical issues (X found)
- **[Category]** Issue description. File: `path/to/file.js:123`
  - **Impact:** Why this matters
  - **Fix:** Specific code change or recommendation

### High priority (X found)
...

### Summary
- Performance: X issues (Y critical)
- Accessibility: X issues (Y critical)
- SEO: X issues
- Best Practices: X issues
```

## Quick checklist

### Before every deploy
- [ ] Core Web Vitals passing
- [ ] No accessibility errors (axe/Lighthouse)
- [ ] No console errors
- [ ] HTTPS working
- [ ] Meta tags present
- [ ] npm audit clean
