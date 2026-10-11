import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { captureError } = await import("@/lib/monitoring");
  await captureError(error, { path: request.path, method: request.method, routeType: context.routeType });
};
