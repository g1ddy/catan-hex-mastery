# Palette's Journal

## 2024-05-23 - Accessibility of Lucide Icons & Linting Strictness
**Learning:** `lucide-react` icons are visual-only and require explicit `aria-hidden="true"` and a wrapping element with `aria-label` for screen reader support. Additionally, strict `security/detect-object-injection` linting requires explicit disabling when accessing objects using keys from trusted constant arrays (like `RESOURCE_META`).
**Action:** When adding icons, always wrap them with accessible labels. When iterating over trusted configuration objects, be prepared to suppress security warnings for object access.

## 2024-05-23 - Confusing Icon Semantics
**Learning:** Reusing specific resource icons (like "Trees" for Wood) to represent generic "Total Resources" creates semantic confusion and accessibility barriers. Users may mistake the total count for a specific resource count.
**Action:** Use generic icons (like "Layers" or "Stack") for aggregate counts, and always provide an aria-label for icon-only or icon-heavy summaries.

## 2024-05-27 - [BuildBar Tooltip Accessibility]
**Learning:** Attaching `react-tooltip` to a non-focusable wrapper `div` breaks accessibility for keyboard users. Buttons rendered with `aria-disabled="true"` instead of `disabled` remain focusable, allowing tooltips to be placed directly on the button for better UX.
**Action:** When implementing tooltips on disabled controls, use `aria-disabled` and attach tooltip attributes directly to the focusable element.
