export function ensureFound(
  value: unknown,
  message: string
) {
  if (!value) {
    throw new Error(message);
  }
}