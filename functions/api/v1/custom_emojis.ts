export const onRequest = async () => {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "max-age=300, public",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
  };
  const res: any = [];
  return new Response(JSON.stringify(res), { headers });
};
