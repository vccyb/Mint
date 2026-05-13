# Frontend Architecture Guide

## Stack

- **Framework:** React 18+
- **State Management:** React Context + custom hooks
- **Routing:** React Router
- **Styling:** CSS Modules with design tokens
- **Testing:** Vitest + React Testing Library

## Directory Structure

```
packages/web/src/
├── types/         ← Frontend-specific type definitions
├── components/    ← Reusable UI components
├── hooks/         ← Custom React hooks
├── pages/         ← Page-level components (route targets)
└── providers/     ← Context providers for cross-cutting concerns
```

## Patterns

### Data Fetching
- Use custom hooks for data fetching
- Handle loading, error, and success states explicitly
- Never fetch data in component body — always in hooks

### Component Design
- Props interface defined above component
- Destructure props in function signature
- Keep components under 300 lines
- Extract complex logic to hooks

### State Management
- Local state: `useState`
- Shared state: Context + Provider pattern
- Server state: Fetch hooks with cache strategy

### Error Handling
- Error boundaries at page level
- Graceful degradation for non-critical UI
- User-facing error messages, not stack traces
