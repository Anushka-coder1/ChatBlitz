export const isEmail = (value = "") => /\S+@\S+\.\S+/.test(value);

export const normalizeUsername = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");

export const ensureArray = (value) => (Array.isArray(value) ? value : []);
