import { verifyToken } from "../utils/jwt.js";
import { httpError } from "../utils/httpError.js";

const getTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.auth_token;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
};

const authMiddleware = (req, _res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    next(httpError(401, "Authentication required"));
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(httpError(401, "Invalid or expired token"));
  }
};

export default authMiddleware;
