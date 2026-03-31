# ADR-0002: Payment Provider SDK Mandate

## Status
Accepted

## Date
2026-03-31

## Context
The application integrates with payment and tracking providers (Stripe, PayPal, PayMongo, Maya, AfterShip, cash on delivery). Initial implementations used hand-rolled HTTP fetch calls, which created maintenance burden, missed SDK-level validations, and duplicated error handling.

## Decision
All payment and tracking provider integrations MUST use the official vendor SDK where one exists for Node.js. Where no official SDK exists (PayMongo, Maya), a typed client wrapper in `apps/medusa/src/lib/*-sdk-client.ts` with full TypeScript types replaces raw fetch.

### SDK Usage Matrix
| Provider | Official SDK | Package |
|----------|-------------|---------|
| AfterShip | Yes | `@aftership/tracking-sdk` |
| PayPal | Yes | `@paypal/paypal-server-sdk` + `@paypal/react-paypal-js` |
| Stripe | Yes (via Medusa plugin) | `@stripe/stripe-js` + `@stripe/react-stripe-js` |
| PayMongo | No | Typed client wrapper |
| Maya | No | Typed client wrapper |

## Consequences
- Consistent error handling and type safety across all provider integrations
- Reduced maintenance when providers update their APIs
- SDK version updates tracked in `package.json`
- Webhook verification uses SDK-provided methods where available
