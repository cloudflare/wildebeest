import { strict as assert } from "node:assert/strict";
import * as instance from "../functions/api/v1/instance";
import * as apps from "../functions/api/v1/apps";
import * as oauth_authorize from "../functions/oauth/authorize";
import * as oauth_token from "../functions/oauth/token";
import * as accounts_verify_creds from "../functions/api/v1/accounts/verify_credentials";

function assertCORS(response: Response) {
  assert(response.headers.has("Access-Control-Allow-Origin"));
  assert(response.headers.has("Access-Control-Allow-Headers"));
}

function assertJSON(response: Response) {
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
}

function assertCache(response: Response, maxge: number) {
  assert(response.headers.has("cache-control"));
  assert(response.headers.get("cache-control")!.includes("max-age=" + maxge));
}

describe("Mastodon APIs", () => {
  describe("instance", () => {
    test("return the instance infos", async () => {
      const res = await instance.onRequest();
      assert.equal(res.status, 200);
      assertCORS(res);
      assertJSON(res);
      assertCache(res, 180);
    });
  });

  describe("apps", () => {
    test("return the app infos", async () => {
      const res = await apps.onRequest();
      assert.equal(res.status, 200);
      assertCORS(res);
      assertJSON(res);
    });
  });

  describe("accounts", () => {
    test("missing identity", async () => {
      const data = {
        cloudflareAccess: {
          JWT: {
            getIdentity() {
              return null;
            }
          }
        }
      };

      const context: any = { data };
      const res = await accounts_verify_creds.onRequest(context);
      assert.equal(res.status, 401);
    });

    test("verify the credentials", async () => {
      const cloudflareAccess = {
        JWT: {
          getIdentity() {
            return {
              email: "sven@cloudflare.com"
            }
          }
        }
      };

      const context: any = { data: { cloudflareAccess }};
      const res = await accounts_verify_creds.onRequest(context);
      assert.equal(res.status, 200);
      assertCORS(res);
      assertJSON(res);

      const data = await res.json<any>();
      assert.equal(data.display_name, "sven@cloudflare.com");
    });
  });

  describe("oauth", () => {
    test("authorize missing params", async () => {
      let req = new Request("https://example.com/oauth/authorize");
      let res = await oauth_authorize.handleRequest(req);
      assert.equal(res.status, 400);

      req = new Request("https://example.com/oauth/authorize?scope=foobar");
      res = await oauth_authorize.handleRequest(req);
      assert.equal(res.status, 400);
    });

    test("authorize unsupported response_type", async () => {
      const params = new URLSearchParams({
        redirect_uri: "https://example.com",
        response_type: "hein",
        client_id: "client_id",
      });

      const req = new Request("https://example.com/oauth/authorize?" + params);
      const res = await oauth_authorize.handleRequest(req);
      assert.equal(res.status, 400);
    });

    test("authorize redirects with code on success", async () => {
      const params = new URLSearchParams({
        redirect_uri: "https://example.com",
        response_type: "code",
        client_id: "client_id",
      });

      const headers = {
        "Cf-Access-Jwt-Assertion": "jwt-from-access",
      };

      const req = new Request("https://example.com/oauth/authorize?" + params, { headers });
      const res = await oauth_authorize.handleRequest(req);
      assert.equal(res.status, 307);

      const location = res.headers.get("location");
      assert.equal(location, "https://example.com/?code=jwt-from-access");
    });

    test("token returns auth infos", async () => {
      const body = {
        code: "some-code",
      };

      const req = new Request("https://example.com/oauth/token", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const res = await oauth_token.handleRequest(req);
      assert.equal(res.status, 200);
      assertCORS(res);
      assertJSON(res);

      const data = await res.json<any>();
      assert.equal(data.access_token, "some-code");
      assert.equal(data.scope, "read write follow push");
    });
  });
});
