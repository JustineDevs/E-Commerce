/**
 * Application facades: stable entry points for the admin app.
 *
 * Prefer `import { … } from "@/domain/commerce"` (and future `@/domain/…`)
 * in pages, layouts, and API routes that serve user-facing behavior.
 *
 * See `README.md` in this folder.
 */

export * as commerce from "./commerce";
export * as catalogOperations from "./operations/catalog-operations";
export * as orderOperations from "./operations/order-operations";
export * as inventoryOperations from "./operations/inventory-operations";
export * as customerOperations from "./operations/customer-operations";
