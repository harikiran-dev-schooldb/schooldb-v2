export function contains(
  value: string
) {
  return {
    contains: value,

    mode: "insensitive" as const,
  };
}