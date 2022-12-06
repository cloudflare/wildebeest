import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";

export const onRequest: PagesFunction<unknown, any, PluginData> = async ({ data, request }) => {
  const identity = await data.cloudflareAccess.JWT.getIdentity();
  if (!identity) {
    return new Response("", { status: 403 });
  }
  return handleRequest(request, identity.email);
};

export function handleRequest(request: Request, email: string): Response {
  return new Response("hi " + email);
}
