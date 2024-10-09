# Coupon Code Service

This project implements a Coupon Code service with repeat count functionality to mitigate fraud.

## Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up Redis:
   - Install Redis on your local machine or use a cloud-hosted solution
   - Set the `REDIS_URL` environment variable if not using the default localhost:6379
4. Run the server: `pnpm dev`
5. Run tests: `pnpm test`

## API Endpoints

### Create a Coupon

```
POST /api/coupons/create
{
  "code": "DIWALI2024",
  "description": "Diwali Sale 2024",
  "discountPercentage": 20,
  "expirationDate": "2024-08-31T23:59:59.999Z"
}
```

#### Example

```
# Create a coupon
curl -X POST http://localhost:5000/api/coupons/create \
  -H "Content-Type: application/json" \
  -d '{"code": "DIWALI2024", "description": "Diwali Sale 2024", "discountPercentage": 20, "expirationDate": "2024-08-31T23:59:59.999Z"}'
```

### Add Repeat Counts to a Coupon Code

```
POST /api/coupons/add-repeat-counts
{
  "code": "DIWALI2024",
  "repeatCounts": [
    { "type": "GLOBAL_TOTAL", "limit": 10000, "current": 0 },
    { "type": "USER_TOTAL", "limit": 3, "current": 0 },
    { "type": "USER_DAILY", "limit": 1, "current": 0 },
    { "type": "USER_WEEKLY", "limit": 1, "current": 0 }
  ]
}
```

#### Example

```
# Add repeat counts
curl -X POST http://localhost:5000/api/coupons/add-repeat-counts \
  -H "Content-Type: application/json" \
  -d '{"code": "DIWALI2024", "repeatCounts": [{"type": "GLOBAL_TOTAL", "limit": 10000, "current": 0}, {"type": "USER_TOTAL", "limit": 3, "current": 0}, {"type": "USER_DAILY", "limit": 3, "current": 0}, {"type": "USER_WEEKLY", "limit": 3, "current": 0}]}'
```

### Verify Coupon Code

```
POST /api/coupons/verify
{
  "code": "EXAMPLE123",
  "userId": "user123"
}
```

#### Example

```
# Verify the coupon
curl -X POST http://localhost:5000/api/coupons/verify \
  -H "Content-Type: application/json" \
  -d '{"code": "DIWALI2024", "userId": "user123"}'
```

### Apply Coupon Code

```
POST /api/coupons/apply
{
  "code": "EXAMPLE123",
  "userId": "user123"
}
```

#### Example

```
# Apply the coupon
curl -X POST http://localhost:5000/api/coupons/apply \
  -H "Content-Type: application/json" \
  -d '{"code": "DIWALI2024", "userId": "user123"}'
```

### Get coupon information again to check updated repeat counts

```
GET /api/coupons/:code
```

#### Example

```
  curl -X GET http://localhost:5000/api/coupons/DIWALI2024
```

#### Delete the coupon

```
DELETE /api/coupons/:code
```

#### Example

```
curl -X DELETE http://localhost:5000/api/coupons/DIWALI2024
```

## Trade-offs and Scalability Challenges

1. Redis as in-memory storage: While Redis provides better performance and scalability compared to a simple in-memory Map, it still has limitations for very large datasets. We should consider implementing a hybrid approach with a persistent database for long-term storage. We can use a mixture of in-memory storage(redis) and a persistent database like Postgres, or enable persistency in our Redis instance.
2. Concurrency: Redis provides atomic operations, which helps with concurrency issues. I have also added some locking mechanisms to prevent issues if the the coupon code is being used by multiple users at the same time, but needs to be checked thoroughly.
3. Data persistence: Configure Redis persistence (RDB or AOF) to prevent data loss in case of server restarts.
4. Connection management: Implement proper connection pooling and error handling for Redis connections to ensure robustness.
5. Scalability: While Redis can handle high throughput, we may need to implement Redis Cluster for horizontal scalability as your data grows.
