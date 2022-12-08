const headers = {
  "accept": "application/activity+json",
};

export async function get(url: string): Promise<any> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`${url} returned: ${res.status}`);
  }

  return res.json<any>();
}
