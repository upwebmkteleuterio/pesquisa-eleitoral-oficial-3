# AI Coding Rules & Project Standards

## 🛠 Tech Stack
*   **Framework**: React 19 with TypeScript for a type-safe frontend.
*   **Routing**: React Router 7 for client-side navigation.
*   **Styling**: Tailwind CSS v4 using the modern `@theme` API for design tokens.
*   **State Management**: 
    *   **Zustand**: For client-side state (UI themes, multi-step form progress).
    *   **TanStack Query**: For server-state, caching, and data synchronization.
*   **Icons**: Lucide React for consistent, accessible iconography.
*   **Animations**: Motion (formerly Framer Motion) for fluid UI transitions.
*   **Charts**: Recharts for data visualization and reporting dashboards.
*   **Storage**: localforage for offline-first data persistence and local caching.
*   **Backend (Vite)**: Express.js integration for AI processing via Google Gemini.

## 📏 Library Usage Rules

### 1. UI & Styling
*   **Tailwind Exclusively**: Do not use CSS modules or plain CSS files. Use Tailwind utility classes for all styling.
*   **Themes**: Use the CSS variables defined in `src/index.css` (e.g., `var(--color-primary)`) via Tailwind's theme system.
*   **Responsive Design**: Always use mobile-first breakpoints (`sm:`, `md:`, `lg:`).

### 2. State Management
*   **Server Data**: Use `useQuery` and `useMutation` for anything that touches an API or the `submissionService`/`surveyService`.
*   **UI/Local State**: Use `useState` for simple component-level state. Use `Zustand` (`src/store/index.ts`) for state that needs to persist or be shared across routes (like the survey collection progress).

### 3. Icons & Media
*   **Lucide**: Use `lucide-react` for all icons. Standardize on `size={20}` or `size={24}` for most actions.
*   **Images**: Use high-quality Unsplash URLs for mocks or standard profile placeholders.

### 4. Code Structure
*   **Components**: Keep components under 100 lines. Break down large files into sub-components.
*   **Services**: All logic for data fetching or storage must live in `src/services/`. Do not write `localforage` or `fetch` calls directly inside components.
*   **Types**: Define all shared interfaces in `src/types.ts`.

### 5. Offline-First Approach
*   **Persistence**: Assume the user might be offline. Always save survey responses to `localforage` immediately via the `submissionService`.
*   **Sync Logic**: Only trigger "Sincronizar" actions when `navigator.onLine` is true.

## 📂 File Naming Conventions
*   **Pages**: `src/pages/PageName.tsx` (PascalCase)
*   **Components**: `src/components/ComponentName.tsx` (PascalCase)
*   **Services/Hooks**: `src/services/serviceName.ts` or `src/hooks/useHookName.ts` (camelCase)
*   **Folders**: All lowercase (e.g., `src/pages/admin/`)