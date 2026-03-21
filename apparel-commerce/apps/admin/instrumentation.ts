export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { assertAdminMedusaEnvProduction } = await import(
    "@apparel-commerce/sdk"
  );
  assertAdminMedusaEnvProduction();
}
