<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Rules

- Clean Code, SOLID, No `any` (STRICT typing).
- Early returns, try/catch.
- UI: Mobile-first, Dark/Light mode.
- Base UI: ALWAYS reuse `components/ui`, especially for forms.
- Icons: Use `@fortawesome/react-fontawesome` & `@fortawesome/free-solid-svg-icons`.
- Utils: Centralize in `utils.ts`. Check existing first.
- Modals: STRICTLY separate files for reuse.
- Types: Entities in `type` folder MUST strictly reflect DB schema.
- Data Flow: Supabase = Single Source of Truth. Shopify API ONLY for updating `orders`/`order_items` in Supabase.

<!-- END:nextjs-agent-rules -->
