import { ZodSchema } from "zod";

export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await req.json();

  return schema.parse(body);
}