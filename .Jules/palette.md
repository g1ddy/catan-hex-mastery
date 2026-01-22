# Palette's Journal

## 2024-05-23 - Accessibility of Lucide Icons & Linting Strictness
**Learning:** `lucide-react` icons are visual-only and require explicit `aria-hidden="true"` and a wrapping element with `aria-label` for screen reader support. Additionally, strict `security/detect-object-injection` linting requires explicit disabling when accessing objects using keys from trusted constant arrays (like `RESOURCE_META`).
**Action:** When adding icons, always wrap them with accessible labels. When iterating over trusted configuration objects, be prepared to suppress security warnings for object access.
