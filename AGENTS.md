# AI Audit Workbench - Development Guide

## Overview

AI Audit Workbench 是一个基于 React 18 + TypeScript + Vite 构建的智能审计辅助系统。项目使用 Tailwind CSS 进行样式管理，通过 Supabase 进行用户认证，并集成了 Google GenAI API 提供 LLM 能力。

## Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

**No dedicated test/lint commands exist.** To add testing:

```bash
# Install test dependencies
npm install -D vitest @testing-library/react @testing-library/user-event

# Run tests
npx vitest

# Run single test file
npx vitest run src/components/ActionPanel.test.tsx
```

## Code Style Guidelines

### Imports

Organize imports in three groups separated by blank lines:

```typescript
// 1. React core
import React, { useEffect, useState, useRef } from 'react';

// 2. Components (aliased imports)
import { ChatPanel } from './components/ChatPanel';
import { ActionPanel } from './components/ActionPanel';

// 3. Types
import { AppState, Project } from './types';

// 4. Utils / Services
import { exportToCsv } from './utils/csvExport';
import { post } from './services/api';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `AuditProgramPanel.tsx` |
| Hooks | camelCase + prefix | `useProject()`, `useGlobal()` |
| Interfaces/Types | PascalCase | `AuditProgram`, `GlobalState` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Variables/Functions | camelCase | `handleSendMessage` |
| Files | kebab-case | `csv-export.ts` |

### React Components

Prefer function components with hooks over class components:

```typescript
// Good
export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  return <header>...</header>;
};

// Avoid
class Header extends React.Component<Props> { ... }
```

Use explicit return types for exported components:

```typescript
export const ComponentName: React.FC<Props> = () => { ... }
```

### TypeScript

Enable strict mode settings from `tsconfig.json`:

- `noUnusedLocals: true` - Remove unused local variables
- `noUnusedParameters: true` - Remove unused function parameters
- `strict: true` - Enable all strict type checking
- `noFallthroughCasesInSwitch: true` - Handle all switch cases

Define interfaces for all data structures:

```typescript
export interface AuditProcedure {
  id: string;
  risk: string;
  riskLevel: '高' | '中' | '低';
  control: string;
  testStep: string;
  sourceSnippetId?: string;
}
```

Use discriminated unions for variant types:

```typescript
export type AuditProgramGenerationChunk =
  | { type: 'reasoning'; content: string }
  | { type: 'workflow_update'; steps: WorkflowStep[] }
  | { type: 'result'; content: string }
  | { type: 'error'; message: string };
```

### Error Handling

Wrap async operations with proper error handling:

```typescript
try {
  const result = await fetchData();
  return result;
} catch (error) {
  console.error('Failed to fetch data:', error);
  throw new Error(`Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

For API calls, use the established pattern in `services/api.ts`:

```typescript
if (!response.ok) {
  const errorData = await response.json().catch(() => ({ message: response.statusText }));
  throw new Error(errorData.message || `API Error: ${response.status}`);
}
```

### Hooks Pattern

Use composition pattern for shared logic:

```typescript
// In contexts/ProjectContext.tsx
export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
```

### File Organization

```
├── components/          # React components
├── contexts/           # React contexts (Global, Project, UI, Auth)
├── hooks/              # Custom hooks
├── services/           # API services
├── utils/              # Utility functions
├── types.ts            # TypeScript interfaces
├── App.tsx             # Root component
├── index.tsx           # Entry point
└── opencode.json       # OpenCode configuration
```

### Tailwind CSS

Use utility classes with consistent spacing:

```tsx
<div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
  <span className="text-slate-600 font-medium">Label</span>
</div>
```

Common color palette: `slate` for neutrals, `blue` for primary actions, `red` for errors.

### Async Patterns

For streaming responses, use the generator pattern from `services/api.ts`:

```typescript
export async function* postStream(
  endpoint: string,
  body: any,
  signal?: AbortSignal
): AsyncGenerator<any> {
  // Implementation with proper error handling
}
```

### Critical Notes

1. **No test suite exists** - Add tests before refactoring critical paths
2. **No ESLint/Prettier config** - Consider adding for consistent formatting
3. **API proxy required** - Frontend expects backend at `/api` prefix
4. **Environment variables** - Set `GEMINI_API_KEY` in `.env.local`
5. **Type checking** - Run `npx tsc --noEmit` before commits

### Recommended Improvements

- Add Vitest + React Testing Library
- Configure ESLint + Prettier with TypeScript React preset
- Add Husky pre-commit hooks for lint/typecheck
- Create Playwright E2E tests in `tests/` directory
