// pages/api/pdf/read.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
  secure: true,
});

function formatValue(value: unknown): string {
  if (typeof value !== "string") {
    if (Array.isArray(value) && value.length === 1 && typeof value[0] === "string") {
      return formatValue(value[0]);
    }
    return value === null || value === undefined ? "" : String(value);
  }

  if (!value.includes("[") && !value.includes("{") && !value.includes('"')) {
    return value.trim();
  }

  let parsed: unknown = value;

  if (
    (value.startsWith("[") && value.endsWith("]")) ||
    (value.startsWith("{") && value.endsWith("}"))
  ) {
    try {
      const jsonParsed = JSON.parse(value);
      if (Array.isArray(jsonParsed) && jsonParsed.length === 1 && typeof jsonParsed[0] === "string") {
        parsed = jsonParsed[0];
      } else if (typeof jsonParsed === "string") {
        parsed = jsonParsed;
      }
    } catch {
      // Keep original on parse failure
    }
  }

  if (typeof parsed === "string") {
    const unescaped = parsed
      .replace(/\\r\\n|\\n|\\r/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\")
      .trim();

    if (unescaped.length > 1 && unescaped.startsWith('"') && unescaped.endsWith('"')) {
      return unescaped.slice(1, -1);
    }

    return unescaped;
  }

  return String(parsed ?? "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Accept id values that may be wrapped like ["pdfs/abc.pdf"] and clean them.
    const rawId = req.query.id ?? "";
    const id = formatValue(rawId);
    const v = req.query.v ? formatValue(req.query.v) : undefined;

    if (!id || !id.endsWith(".pdf")) {
      return res.status(400).json({ error: "Missing or invalid 'id' (must include .pdf)" });
    }

    const cloudUrl = cloudinary.url(id, {
      resource_type: "raw",
      type: "upload",
      sign_url: true,
      secure: true,
      ...(v ? { version: v } : {}),
    });

    const resp = await fetch(cloudUrl);
    if (!resp.ok || !resp.body) {
      return res.status(resp.status).end(await resp.text());
    }

    res.setHeader("Content-Type", "application/pdf");
    const filename = id.split("/").pop() || "file.pdf";
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=600");

    const reader = resp.body.getReader();
    res.status(200);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (e: any) {
    console.error("PDF read proxy error:", e?.message || e);
    res.status(500).json({ error: "Failed to proxy PDF" });
  }
}
