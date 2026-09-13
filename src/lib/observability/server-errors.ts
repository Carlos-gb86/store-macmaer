type RequestErrorDetails = {
  path: string;
  method: string;
  routePath: string;
  routeType: string;
};

function pathnameOnly(path: string) {
  try {
    return new URL(path, "https://internal.invalid").pathname;
  } catch {
    return "/invalid-path";
  }
}

function stringProperty(value: unknown, property: string) {
  if (!value || typeof value !== "object" || !(property in value)) return null;
  const candidate = Reflect.get(value, property);
  return typeof candidate === "string" ? candidate.slice(0, 160) : null;
}

export function serverErrorRecord(
  error: unknown,
  details: RequestErrorDetails,
) {
  return {
    event: "unhandled_request_error",
    errorName:
      error instanceof Error ? error.name.slice(0, 80) : "UnknownThrownValue",
    errorCode: stringProperty(error, "code"),
    digest: stringProperty(error, "digest"),
    method: details.method.slice(0, 12),
    path: pathnameOnly(details.path),
    routePath: details.routePath.slice(0, 240),
    routeType: details.routeType.slice(0, 40),
  };
}
