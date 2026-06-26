import { getStore } from "@netlify/blobs";

const KEY = "products";

export default async (req) => {
  const store = getStore({ name: "catalog", consistency: "strong" });

  // ---- READ (public) ----
  if (req.method === "GET") {
    let data = await store.get(KEY, { type: "json" });
    if (!data) {
      // first run: seed from the bundled products.json
      try {
        const res = await fetch(new URL("/products.json", req.url));
        data = res.ok ? await res.json() : [];
      } catch { data = []; }
    }
    return Response.json(data, { headers: { "cache-control": "no-store" } });
  }

  // ---- WRITE (protected by ADMIN_TOKEN) ----
  if (req.method === "POST") {
    if (req.headers.get("x-admin-token") !== process.env.ADMIN_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }
    let body;
    try { body = await req.json(); }
    catch { return new Response("Bad JSON", { status: 400 }); }
    if (!Array.isArray(body)) {
      return new Response("Expected an array of products", { status: 400 });
    }
    await store.setJSON(KEY, body);
    return Response.json({ ok: true, count: body.length });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/products" };
