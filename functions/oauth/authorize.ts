// https://docs.joinmastodon.org/methods/oauth/#authorize

// Extract the JWT token sent by Access (running before us).
const extractJWTFromRequest = (request: Request) =>
  request.headers.get("Cf-Access-Jwt-Assertion");

export const onRequest: PagesFunction<unknown, any> = async ({ request }) => {
  return handleRequest(request);
};

export function handleRequest(request: Request): Response {
  const url = new URL(request.url);

  if (!(
    url.searchParams.has("redirect_uri")
    && url.searchParams.has("response_type")
    && url.searchParams.has("client_id")
  )) {
    return new Response("", { status: 400 });
  }

  const response_type = url.searchParams.get("response_type");
  if (response_type !== "code") {
    return new Response("", { status: 400 });
  }

  const redirect_uri = url.searchParams.get("redirect_uri");
  const scope = url.searchParams.get("scope") || "";

  const code = extractJWTFromRequest(request);

  return Response.redirect(redirect_uri + "?code=" + code, 307);
};
