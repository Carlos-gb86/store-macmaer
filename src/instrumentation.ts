import type { Instrumentation } from "next";
import { serverErrorRecord } from "@/lib/observability/server-errors";

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  // Do not include headers, query strings, error messages, or request bodies:
  // all can contain customer data or credentials. Vercel retains the JSON log
  // for correlation while Next.js records the original exception separately.
  console.error(
    JSON.stringify(
      serverErrorRecord(error, {
        path: request.path,
        method: request.method,
        routePath: context.routePath,
        routeType: context.routeType,
      }),
    ),
  );
};
