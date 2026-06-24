/**
 * Typed access point to the preload bridge (`window.workiq`).
 *
 * Every feature imports `bridge` from here instead of touching the `window`
 * global directly. Benefits:
 *
 * - **Discoverability** — the whole IPC surface flows through one module.
 * - **Dependency inversion** — UI depends on this abstraction, not on `window`,
 *   so it is trivial to mock in tests or point at a different transport.
 * - **DRY** — no `window.workiq` repeated across dozens of components.
 *
 * The shape of `window.workiq` is declared in `./workiq.d.ts` and must stay in
 * sync with `apps/desktop-client/src/preload.ts`.
 */
export const bridge = window.workiq;

/** The full bridge API type, handy for typing mocks or helper utilities. */
export type Bridge = typeof bridge;
