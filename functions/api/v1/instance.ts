import config from "../../../config/instance.json";

export const onRequest = () => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "content-type": "application/json; charset=utf-8",
    "cache-control": "max-age=180, public",
  };
  return new Response(JSON.stringify(config), { headers });
};
