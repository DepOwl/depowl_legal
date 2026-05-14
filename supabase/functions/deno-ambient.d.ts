/**
 * Minimal typings for Supabase Edge Functions (Deno) so `tsc` / the IDE can
 * typecheck this folder without enabling the Deno extension.
 */
declare const Deno: {
  env: { get(key: string): string | undefined }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}
