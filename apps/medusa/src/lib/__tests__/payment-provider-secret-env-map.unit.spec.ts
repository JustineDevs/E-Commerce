import { describe, expect, it } from "@jest/globals";
import { mapPaymentSecretJsonKeyToEnvVar } from "../payment-provider-secret-env-map";

describe("mapPaymentSecretJsonKeyToEnvVar", () => {
  it("maps stripe and aftership fields to Medusa env names", () => {
    expect(mapPaymentSecretJsonKeyToEnvVar("stripe", "secretKey")).toBe(
      "STRIPE_API_KEY",
    );
    expect(
      mapPaymentSecretJsonKeyToEnvVar("aftership", "courierSlug"),
    ).toBe("AFTERSHIP_COURIER_SLUG");
  });

  it("returns null for unknown provider or key", () => {
    expect(mapPaymentSecretJsonKeyToEnvVar("stripe", "unknown")).toBeNull();
    expect(mapPaymentSecretJsonKeyToEnvVar("unknown", "x")).toBeNull();
  });
});
