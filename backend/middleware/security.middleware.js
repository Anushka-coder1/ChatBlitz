const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 180;
const requestsByIp = new Map();

const blockedKeys = new Set(["$where", "$regex", "$ne", "$gt", "$lt", "$gte", "$lte", "$or", "$and"]);

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      if (key.startsWith("$") || key.includes(".") || blockedKeys.has(key)) {
        return accumulator;
      }

      accumulator[key] = sanitizeValue(nestedValue);
      return accumulator;
    }, {});
  }

  if (typeof value === "string") {
    return value.replace(/[<>]/g, "").trim();
  }

  return value;
};

export const sanitizeInput = (req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    const sanitizedBody = sanitizeValue(req.body);
    Object.keys(req.body).forEach((key) => delete req.body[key]);
    Object.assign(req.body, sanitizedBody);
  }

  if (req.query && typeof req.query === "object") {
    const sanitizedQuery = sanitizeValue(req.query);
    Object.keys(req.query).forEach((key) => delete req.query[key]);
    Object.assign(req.query, sanitizedQuery);
  }

  next();
};

export const apiRateLimiter = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const currentWindow = requestsByIp.get(key) || { count: 0, expiresAt: now + WINDOW_MS };

  if (now > currentWindow.expiresAt) {
    requestsByIp.set(key, { count: 1, expiresAt: now + WINDOW_MS });
    next();
    return;
  }

  currentWindow.count += 1;
  requestsByIp.set(key, currentWindow);

  if (currentWindow.count > MAX_REQUESTS) {
    res.status(429).json({
      status: "error",
      message: "Too many requests. Please try again shortly.",
    });
    return;
  }

  next();
};

export const applySecurityHeaders = (_req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self' https: ws: wss:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  );
  next();
};
