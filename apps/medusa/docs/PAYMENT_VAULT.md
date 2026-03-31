# Payment method storage and lifecycle

This project uses Medusa payment providers with hosted checkouts. Card data is not stored in this repository.

| Provider | Vault / tokens | Disconnect / delete |
|----------|------------------|---------------------|
| Stripe | Stripe Elements / Checkout; PaymentMethods in Stripe | Customer manages cards in Stripe Customer Portal or your flows; no raw PAN in Medusa. |
| PayMongo | PayMongo hosted links; no saved cards in Medusa | N/A for this integration. |
| Maya | Maya Checkout hosted; no card PAN in Medusa | N/A for this integration. |
| PayPal | PayPal account and vaulted instruments in PayPal | `deleteAccountHolder` on PayPal provider removes stored payment methods when Medusa customer is deleted. |

**Storefront account settings:** Use the internal compliance flow to delete the Medusa customer and Supabase user; PayPal account holder deletion runs through the provider when configured.
