# Design System Guide

## Principles

1. **Consistency over creativity** — Use established patterns
2. **Composition over configuration** — Small, composable components
3. **Accessibility by default** — All interactive elements are accessible
4. **Responsive first** — Design for mobile, enhance for desktop

## Component Architecture

Components live in `packages/web/src/components/` and follow this structure:

```
ComponentName/
├── ComponentName.tsx       ← Component implementation
├── ComponentName.test.tsx  ← Component tests
├── ComponentName.stories.tsx ← Component stories (optional)
└── index.ts               ← Public exports
```

## Naming Conventions

- Components: PascalCase (e.g., `UserCard`)
- Hooks: camelCase with `use` prefix (e.g., `useAuth`)
- Utils: camelCase (e.g., `formatDate`)
- CSS modules: `ComponentName.module.css`

## Design Tokens

Design tokens are defined as CSS custom properties and consumed via the theme system.
All spacing, colors, and typography must reference tokens — no magic numbers.
