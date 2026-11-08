# Step-03 schema

Drizzle defines the shopper, catalogue, cart, order, contact, and view-history tables in `drizzle/schema.ts`. Money columns are integer pence.
Order fulfilment status is not stored. `lib/order-status.ts` derives PLACED, PACKED, SHIPPED, OUT_FOR_DELIVERY, or DELIVERED from order age, and returns CANCELLED or RETURN_REQUESTED when those timestamps are set.
The first migration enables `pg_trgm` and adds a GIN index on `products.search_vector` plus a trigram index on `products.title`. Every foreign key is indexed.
It works when `npm run db:migrate` applies that migration and the order-status unit tests pass at each age boundary.
