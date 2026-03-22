export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { assertAdminMedusaEnvProduction } = await import(
    "@apparel-commerce/sdk"
  );
  assertAdminMedusaEnvProduction();

  if (process.env.NODE_ENV === "production") {
    if (!process.env.NEXTAUTH_SECRET?.trim()) {
      throw new Error("Admin: NEXTAUTH_SECRET is required in production");
    }
    if (
      !process.env.GOOGLE_CLIENT_ID?.trim() ||
      !process.env.GOOGLE_CLIENT_SECRET?.trim()
    ) {
      console.warn(
        "[admin] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — OAuth sign-in will not work",
      );
    }
  }
}
