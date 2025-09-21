import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string(),
});

export type Environment = z.infer<typeof EnvSchema>;

export function parseEnv(data: any) {
  const { data: env, error } = EnvSchema.safeParse(data);

  if (error) {
    const errorMessage = `error: invalid env:\n${Object.entries(
      z.treeifyError(error).properties ?? {}
    )
      .map(([key, { errors }]) => `${key}: ${errors.join(", ")}`)
      .join("\n")}`;
    throw new Error(errorMessage);
  }

  return env;
}
