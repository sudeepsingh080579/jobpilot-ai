import { extensions } from "@/lib/extensions";

export function POST() {
  return Response.json(
    {
      error: "Browser extension import is not enabled.",
      extensionPoint: extensions.browserExtension,
      contract: { title: "string", company: "string", description: "string", url: "string" },
    },
    { status: 501 },
  );
}
