import type { NextRequest } from "next/server";
import { signUpload } from "@/lib/integrations/cloudinary";
import type { ImageSignResponse } from "@/lib/types";

// GET /api/images/sign?folder=kwhab/menu  ->  signed params (mock values without Cloudinary keys)
// TODO(dev3): restrict allowed folders.
export async function GET(request: NextRequest) {
  const folder = request.nextUrl.searchParams.get("folder") ?? undefined;
  return Response.json((await signUpload(folder)) satisfies ImageSignResponse);
}
