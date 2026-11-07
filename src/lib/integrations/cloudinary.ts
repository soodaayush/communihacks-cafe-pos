import type { ImageSignResponse } from "@/lib/types";

// Safe to import on client and server. signUpload() only works on the server (needs the secret).
const PLACEHOLDER = "/images/placeholder.svg";
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

// TODO(dev3): pick transformations for item tiles (crop, size, rounded corners).
export function imageUrl(publicId: string, size = 256): string {
  if (!publicId) return PLACEHOLDER;
  // No Cloudinary account yet: use the demo drawings in public/images/menu/.
  if (!cloudName) return `/images/menu/${publicId.split("/").pop()}.svg`;
  // VERIFY against docs: https://cloudinary.com/documentation/image_transformations
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_${size},h_${size},f_auto,q_auto/${publicId}`;
}

// Signed upload params for the browser to POST to Cloudinary's upload endpoint.
export async function signUpload(folder = "kwhab/menu"): Promise<ImageSignResponse> {
  const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
  const timestamp = Math.floor(Date.now() / 1000);
  if (!cloudName || !apiKey || !apiSecret) {
    return { cloudName: "demo", apiKey: "mock", timestamp, signature: "mock", folder };
  }
  // VERIFY against docs: https://cloudinary.com/documentation/authentication_signatures
  // (params sorted alphabetically, joined with &, secret appended, SHA-1 hex).
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(toSign));
  const signature = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return { cloudName, apiKey, timestamp, signature, folder };
}
