---
name: core-web-vitals
description: Optimize Core Web Vitals (LCP, INP, CLS) for better page experience and search ranking. Use when asked to "improve Core Web Vitals", "fix LCP", "reduce CLS", "optimize INP", "page experience optimization", or "fix layout shifts". Focuses specifically on the three Core Web Vitals metrics. Do NOT use for general web performance (use web-quality-audit), or non-performance tasks.
license: MIT
metadata:
  author: web-quality-skills
  version: '1.0'
---

# Core Web Vitals Optimization

| Metric | Measures | Good | Needs work | Poor |
| ------- | -------- | ---- | ---------- | ---- |
| **LCP** | Loading | ≤ 2.5s | 2.5s – 4s | > 4s |
| **INP** | Interactivity | ≤ 200ms | 200ms – 500ms | > 500ms |
| **CLS** | Visual Stability | ≤ 0.1 | 0.1 – 0.25 | > 0.25 |

Google measures at the **75th percentile**.

## LCP: Largest Contentful Paint

### Common causes in React + Vite projects
- Client-side rendering delays (content loads after JS hydration)
- Images without `fetchpriority="high"` on LCP candidate
- Render-blocking CSS or fonts

### React fixes
```jsx
// LCP: Preload hero image
<link rel="preload" href="/hero.jpg" as="image" fetchpriority="high" />

// Avoid useEffect for above-fold content
// ❌ Content loads after JavaScript
useEffect(() => { fetch('/api/hero').then(setHeroData) }, [])

// ✅ Provide initial data server-side or as static props
```

### LCP checklist
- [ ] LCP image preloaded with `fetchpriority="high"`
- [ ] LCP image optimized (WebP/AVIF, correct size)
- [ ] Critical CSS inlined (< 14KB)
- [ ] No render-blocking JavaScript in `<head>`
- [ ] Fonts use `font-display: swap`

## INP: Interaction to Next Paint

### Common causes in React apps
- Heavy event handlers blocking main thread
- Excessive re-renders in large component trees
- Third-party scripts blocking interactions

### React fixes
```jsx
// ❌ Re-renders entire tree
function App() {
  const [count, setCount] = useState(0)
  return <div><Counter count={count} /><ExpensiveComponent /></div>
}

// ✅ Memoized expensive components
const MemoizedExpensive = React.memo(ExpensiveComponent)

// ✅ useTransition for non-urgent state updates
const [isPending, startTransition] = useTransition()
startTransition(() => setExpensiveState(newValue))

// ✅ Immediate visual feedback first
button.addEventListener('click', () => {
  button.classList.add('loading')           // Immediate feedback
  requestAnimationFrame(() => heavyWork())  // Defer heavy work
})
```

### INP checklist
- [ ] No tasks > 50ms on main thread
- [ ] Event handlers complete quickly (< 100ms)
- [ ] Visual feedback provided immediately
- [ ] Debounced input handlers where appropriate
- [ ] Web Workers for CPU-intensive operations

## CLS: Cumulative Layout Shift

### Common causes
- Images without explicit dimensions
- Dynamically injected content above existing content
- Fonts causing FOUT (Flash of Unstyled Text)

### Fixes
```html
<!-- ✅ Reserve space for images -->
<img src="photo.jpg" alt="Photo" width="800" height="600" />

<!-- ✅ Or use aspect-ratio -->
<img src="photo.jpg" alt="Photo" style="aspect-ratio: 4/3; width: 100%;" />
```

```css
/* ✅ Prevent font layout shift */
@font-face {
  font-family: 'Custom';
  src: url('custom.woff2') format('woff2');
  font-display: optional;
}

/* ✅ Animate with transform only, never layout properties */
.animate { transition: transform 0.3s; }
```

### CLS checklist
- [ ] All images have width/height or aspect-ratio
- [ ] Fonts use `font-display: optional` or matched metrics
- [ ] Dynamic content inserted below viewport
- [ ] Animations use transform/opacity only
- [ ] No content injected above existing content

## Measurement

```javascript
import { onLCP, onINP, onCLS } from 'web-vitals'

function sendToAnalytics({ name, value, rating }) {
  console.log(`${name}: ${value} (${rating})`)
}

onLCP(sendToAnalytics)
onINP(sendToAnalytics)
onCLS(sendToAnalytics)
```

## ZoraH-specific notes

- The app uses React 18 + Vite — enable `React.lazy()` + `Suspense` for route-level code splitting
- `@xyflow/react` (workflow editor) is heavy — lazy load it: `const Flow = React.lazy(() => import('@xyflow/react'))`
- Recharts dashboards — memoize with `React.memo` on chart components
- `Framer Motion` animations — use `transform` and `opacity` only to avoid CLS
