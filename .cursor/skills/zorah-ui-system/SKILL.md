---
name: zorah-ui-system
description: Enforce ZoraH Design System consistency in React components. Use when creating or modifying React components, pages, dashboards, or UI layouts. Do NOT use for backend, API, database, or non-UI tasks.
---

# ZoraH UI System

Ensures all new UI follows the ZoraH Design System — consistent tokens, component patterns, accessibility, and the 4-state component model.

## Design System Reference

| Resource | Path | Purpose |
|----------|------|---------|
| CSS Variables | `src/styles/design-system.css` | Colors, spacing, shadows, transitions |
| Base components | `src/components/ui/DesignSystem.tsx` | StatCard, MetricBadge, skeleton, fade-in |
| Icons | Lucide React | All icons exclusively |
| Animations | Framer Motion | Entrance, hover, transitions |
| Toasts | Sonner (`import { toast } from 'sonner'`) | User feedback |
| Charts | Recharts | All data visualizations |
| Flow editor | @xyflow/react | Workflow builder nodes |
| Theme | `darkMode: "class"` (Tailwind) | Dark mode support |

## Color Tokens (use these, never hardcode)

```css
/* Primary (Blue) */
--color-primary-500: #3B82F6;
--color-primary-600: #2563EB;

/* Use via Tailwind classes: text-primary-500, bg-primary-600 */
/* Or via CSS: var(--color-primary-500) */
```

**FORBIDDEN:** `text-[#3B82F6]`, `bg-[#2563EB]`, `style={{ color: '#3B82F6' }}`
**FORBIDDEN:** Any violet/purple — not in ZoraH palette

## Mandatory Checks (before creating any component)

1. Check `src/components/ui/DesignSystem.tsx` — does a similar component already exist?
2. Identify correct domain folder: `dashboards/` | `conversations/` | `workflow/` | `settings/` | `ui/`
3. Use CSS variables for all colors, never hardcode
4. Implement all 4 states (see template below)
5. Add `aria-label` to all Lucide icons without adjacent text
6. Support dark mode via `dark:` Tailwind prefix

## 4-State Component Template

Every new component MUST handle all 4 states:

```tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface ExampleCardProps {
  title: string
}

export function ExampleCard({ title }: ExampleCardProps) {
  const [data, setData] = useState<DataType[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // STATE 1: Loading
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="skeleton h-6 w-32 mb-3" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    )
  }

  // STATE 2: Error
  if (error) {
    return (
      <div className="card border-red-200 dark:border-red-800">
        <div className="card-body text-red-600 dark:text-red-400">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  // STATE 3: Empty
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center text-gray-400 py-8">
          <p>Nenhum dado encontrado.</p>
        </div>
      </div>
    )
  }

  // STATE 4: Populated — use Framer Motion for entrance
  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="card-body">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {/* content */}
      </div>
    </motion.div>
  )
}
```

## User Feedback Rules

```tsx
import { toast } from 'sonner'

// ✅ Always provide feedback
const handleSave = async () => {
  try {
    await saveData()
    toast.success('Salvo com sucesso')
  } catch {
    toast.error('Erro ao salvar. Tente novamente.')
  }
}

// ✅ Optimistic updates for instant feel
const handleDelete = async (id: string) => {
  const backup = items
  setItems(items.filter(i => i.id !== id)) // Immediate UI update
  try {
    await deleteItem(id)
    toast.success('Removido')
  } catch {
    setItems(backup) // Rollback
    toast.error('Erro ao remover')
  }
}
```

## Accessibility Checklist

- [ ] Lucide icons without visible text → `<Icon aria-label="Descrição da ação" />`
- [ ] Interactive elements → visible focus ring (`focus:ring-2 focus:ring-primary-500`)
- [ ] Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text
- [ ] Form inputs → always have `<label>` or `aria-label`
- [ ] Modals → `role="dialog"` + `aria-modal="true"` + focus trap

## Component Location Guide

```
src/components/
├── ui/              → Purely presentational, no business logic (Button, Badge, Card, Modal)
├── dashboards/      → Analytics, metrics, stats (StatCard, ChartContainer, KPIGrid)
├── conversations/   → Chat UI, message list, queue (ConversationCard, MessageBubble)
├── workflow/        → Flow editor nodes and controls (WorkflowNode, NodePanel)
├── settings/        → Configuration forms (AIConfigForm, SystemSettingsForm)
└── chat/            → Live chat interface
```
