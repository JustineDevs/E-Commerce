# /trace
# Purpose: Map the actual data flow to find "unwired" logic or hardcoded mocks.

- Act as a System Connectivity Auditor.
- TRACE: Start from [UI Component] -> [API Route / Server Action] -> [Service / Package] -> [Supabase Table/RPC].
- RULES:
    1. Identify any "MOCK", "TODO", or "STUB" in the path.
    2. Check if session/auth is correctly passed or validated at each hop.
    3. Verify if RLS (Row Level Security) on the Supabase table matches the UI's expected access.
- OUTPUT: A "Wiring Health Map" showing [Wired/Partial/Broken] for each hop.
- ZERO-SLOP: Do not say "assuming it works." If you cannot find the file, mark it as [MISSING].

## Key flows to trace

1. **Storefront**: Product list -> shop page; Product detail -> PDP; Add to cart -> reservation; Checkout -> Lemon Squeezy; Order tracking -> AfterShip.
2. **Admin**: Inventory table -> inventory_movements; Orders hub -> orders, order_items; POS -> barcode lookup, order creation, payment link.
3. **API**: Lemon Squeezy webhook -> payment verification -> order paid -> inventory committed; AfterShip webhook -> shipment status update.
