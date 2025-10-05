import type { Auth } from "@/lib/auth";
import { customSessionClient, phoneNumberClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  plugins: [usernameClient(), phoneNumberClient(), customSessionClient<Auth>()],
});
