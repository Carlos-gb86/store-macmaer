const stripeScriptOrigins = [
  "https://js.stripe.com",
  "https://*.js.stripe.com",
];

function sourceOrigin(value?: string) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy({
  isDevelopment,
  supabaseUrl,
}: {
  isDevelopment: boolean;
  supabaseUrl?: string;
}) {
  const supabaseOrigin = sourceOrigin(supabaseUrl);
  const supabaseWebSocket = supabaseOrigin
    ? supabaseOrigin.replace(/^http/, "ws")
    : null;
  const directives = [
    ["default-src", "'self'"],
    [
      "script-src",
      "'self'",
      "'unsafe-inline'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
      ...stripeScriptOrigins,
      "https://maps.googleapis.com",
    ],
    ["style-src", "'self'", "'unsafe-inline'"],
    [
      "img-src",
      "'self'",
      "data:",
      "blob:",
      ...(supabaseOrigin ? [supabaseOrigin] : []),
      "https://*.stripe.com",
      "https://*.link.com",
    ],
    ["font-src", "'self'", "data:"],
    [
      "connect-src",
      "'self'",
      ...(supabaseOrigin ? [supabaseOrigin] : []),
      ...(supabaseWebSocket ? [supabaseWebSocket] : []),
      "https://api.stripe.com",
      "https://maps.googleapis.com",
      "https://link.com",
      "https://*.link.com",
    ],
    [
      "frame-src",
      "https://js.stripe.com",
      "https://*.js.stripe.com",
      "https://hooks.stripe.com",
      "https://link.com",
      "https://*.link.com",
    ],
    ["worker-src", "'self'", "blob:"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ...(isDevelopment ? [] : [["upgrade-insecure-requests"]]),
  ];
  return directives.map((parts) => `${parts.join(" ")};`).join(" ");
}

export function securityHeaders(options: {
  isDevelopment: boolean;
  supabaseUrl?: string;
}) {
  return [
    {
      key: "Content-Security-Policy",
      value: contentSecurityPolicy(options),
    },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), microphone=()",
    },
  ];
}
