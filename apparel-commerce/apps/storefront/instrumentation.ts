export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { assertMedusaStorefrontEnvProduction } = await import(
    "@apparel-commerce/sdk"
  );
  assertMedusaStorefrontEnvProduction();
}
