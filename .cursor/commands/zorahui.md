---
name: /zorahui
description: Cria um novo componente React seguindo o ZoraH Design System — com os 4 estados obrigatórios (loading/error/empty/populated), tokens de cor corretos, acessibilidade e animações Framer Motion. Uso: /zorahui [nome-do-componente] [domínio opcional]
---

Create a new React component following the ZoraH Design System. The component name and optional domain are provided by the user.

## Step 1: Load skills
Load `zorah-ui-system` skill from `.cursor/skills/zorah-ui-system/SKILL.md` AND accessibility section from `web-quality-audit` skill.

## Step 2: Check for existing component
Before creating anything:
- Read `src/components/ui/DesignSystem.tsx` — does a similar component already exist?
- Glob `src/components/**/*.tsx` — search for components with similar names or purposes
- If found: enhance the existing component instead of creating a new one

## Step 3: Determine domain and location
Based on the component name and user context, select the correct domain:
- `src/components/ui/` → purely presentational, no business logic
- `src/components/dashboards/` → analytics, metrics, stats
- `src/components/conversations/` → chat UI, message list, queue
- `src/components/workflow/` → flow editor nodes and controls
- `src/components/settings/` → configuration forms
- `src/components/chat/` → live chat interface

## Step 4: Generate the component
Create the component file with TypeScript (no `any`). Must include ALL 4 states:

**Loading state:** Use `skeleton` CSS class for placeholder shapes
**Error state:** Red-themed error message with retry option
**Empty state:** Meaningful empty state (not blank screen) with call-to-action
**Populated state:** Wrapped in Framer Motion entrance animation

Rules:
- Colors ONLY via CSS variables (`var(--color-primary-500)`) or Tailwind config tokens (NO hex inline, NO arbitrary values like `text-[#3B82F6]`)
- Icons: Lucide React only. Icons without adjacent text MUST have `aria-label`
- Dark mode: use `dark:` Tailwind prefix for all color utilities
- User actions: ALWAYS show feedback via `toast` from Sonner
- Focus states: `focus:outline-none focus:ring-2 focus:ring-primary-500`

## Step 5: TypeScript interface
Define explicit TypeScript props interface. No `any`, no `object`, no implicit types.

## Step 6: Add to domain index
If the domain folder has an `index.ts`, export the new component from it.

## Step 7: Accessibility checklist
Before finishing, verify:
- [ ] All images have `alt` text
- [ ] All Lucide icons without text have `aria-label`
- [ ] Interactive elements have visible focus ring
- [ ] Form inputs (if any) have associated `<label>` or `aria-label`
- [ ] Color contrast meets 4.5:1 minimum

Show the completed component code and its file path.
