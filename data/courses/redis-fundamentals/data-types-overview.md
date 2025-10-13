# Redis Data Types Overview

## What is Redis?

Redis stands for **REmote DIctionary Server**. It's an in-memory data structure store that supports multiple data types beyond simple key-value pairs.

## Core Data Types

### Strings

The most basic Redis type - sequences of bytes.

**Use cases:**
- Caching
- Counters
- Session storage
- Binary data

**Basic commands:**
```bash
SET key "value"
GET key
INCR counter
APPEND key "more"
```

```prism-diagnostic
{
  "topic": "Redis Strings",
  "keywords": ["string", "strings", "counter", "value"],
  "diagnostics": [
    "SET counter 0",
    "INCR counter"
  ]
}
```

### Hashes

Record types with field-value pairs (like objects or dictionaries).

**Use cases:**
- User profiles
- Product catalogs
- Configuration settings
- Structured data

**Basic commands:**
```bash
HSET user:1 name "Alice" age 30
HGET user:1 name
HGETALL user:1
```

```prism-diagnostic
{
  "topic": "Redis Hashes",
  "lessonTopic": "Redis Hashes - Basics",
  "keywords": ["hash", "hashes", "field", "object", "profile"],
  "diagnostics": [
    "HSET user:1 name Alice",
    "HGET user:1 name"
  ]
}
```

```prism-lesson
{
  "topic": "Redis Hashes - Basics",
  "level": "beginner",
  "summary": "Learn to store and retrieve fields in Redis hashes",
  "exercises": [
    { "command": "HSET user:2 email alice@example.com", "feedback": "Perfect! You stored another field in the hash." },
    { "command": "HGET user:2 email", "feedback": "Great! You retrieved the email field." },
    { "command": "HGETALL user:2", "feedback": "Excellent! You retrieved all fields from the hash." },
    { "command": "HSET product:1 name \"Laptop\" price 999", "feedback": "Nice! You can set multiple fields at once." },
    { "command": "HINCRBY product:1 price 50", "feedback": "Perfect! You incremented a numeric field." }
  ]
}
```

### Lists

Ordered collections of strings (linked lists).

**Use cases:**
- Activity feeds
- Message queues
- Recent items
- Task lists

**Basic commands:**
```bash
LPUSH mylist "item1"
RPUSH mylist "item2"
LRANGE mylist 0 -1
LPOP mylist
```

```prism-diagnostic
{
  "topic": "Redis Lists",
  "lessonTopic": "Redis Lists - Basics",
  "keywords": ["list", "lists", "queue", "tasks", "lpush", "rpush"],
  "diagnostics": [
    "LPUSH queue \"task1\"",
    "LRANGE queue 0 -1"
  ]
}
```

```prism-lesson
{
  "topic": "Redis Lists - Basics",
  "level": "beginner",
  "summary": "Learn to work with Redis lists",
  "exercises": [
    { "command": "LPUSH queue \"task2\"", "feedback": "Great! Added to the left of the list." },
    { "command": "RPUSH queue \"task3\"", "feedback": "Perfect! Added to the right of the list." },
    { "command": "LRANGE queue 0 -1", "feedback": "Nice! You viewed all items in the list." },
    { "command": "LPOP queue", "feedback": "Excellent! Removed from the left." }
  ]
}
```

### Sets

Unordered collections of unique strings.

**Use cases:**
- Tags
- Unique visitors
- Social relationships
- Deduplication

**Basic commands:**
```bash
SADD myset "member1" "member2"
SMEMBERS myset
SISMEMBER myset "member1"
SINTER set1 set2
```

```prism-diagnostic
{
  "topic": "Redis Sets",
  "keywords": ["set", "sets", "unique", "tags"],
  "diagnostics": [
    "SADD tags \"redis\"",
    "SMEMBERS tags"
  ]
}
```

### Sorted Sets

Ordered collections with scores for ranking.

**Use cases:**
- Leaderboards
- Priority queues
- Time-series data
- Rankings

**Basic commands:**
```bash
ZADD leaderboard 100 "player1" 95 "player2"
ZRANGE leaderboard 0 -1 WITHSCORES
ZRANK leaderboard "player1"
```

## Advanced Data Types

### Streams

Append-only log structure for event processing.

**Use cases:**
- Event sourcing
- Real-time analytics
- Message brokers
- Activity logs

### Geospatial

Location-based data with geographic queries.

**Use cases:**
- Location services
- Proximity search
- Mapping applications
- Store locators

### Bitmaps

Bitwise operations on strings.

**Use cases:**
- Real-time analytics
- User activity tracking
- Feature flags
- Bloom filters

### HyperLogLog

Probabilistic cardinality estimation.

**Use cases:**
- Unique visitor counting
- Large set cardinality
- Memory-efficient counting

## JSON Support

Redis can store and query JSON documents natively.

**Use cases:**
- Document storage
- Complex objects
- Flexible schemas
- Application state

**Basic commands:**
```bash
JSON.SET bike:1 $ '{"brand":"Trek","price":599}'
JSON.GET bike:1 $.brand
```

## Choosing the Right Data Type

### String vs Hash

**Use String when:**
- Simple key-value
- Caching HTML/JSON
- Counters

**Use Hash when:**
- Multiple related fields
- Object representation
- Partial updates needed

### List vs Set

**Use List when:**
- Order matters
- Duplicates allowed
- FIFO/LIFO needed

**Use Set when:**
- Uniqueness required
- Set operations needed
- Order doesn't matter

### Set vs Sorted Set

**Use Set when:**
- No ranking needed
- Fast membership tests
- Set operations

**Use Sorted Set when:**
- Ranking/scoring needed
- Range queries by score
- Time-based ordering

## Hands-On Exercise

### Exercise: Data Type Comparison

1. **String for simple cache:**
   ```bash
   SET page:home "<html>...</html>"
   GET page:home
   ```

2. **Hash for user profile:**
   ```bash
   HSET user:1 name "Alice" email "alice@example.com" age 30
   HGETALL user:1
   ```

3. **List for activity feed:**
   ```bash
   LPUSH feed:user:1 "Posted a photo"
   LPUSH feed:user:1 "Liked a comment"
   LRANGE feed:user:1 0 4
   ```

4. **Set for tags:**
   ```bash
   SADD post:1:tags "redis" "database" "nosql"
   SMEMBERS post:1:tags
   ```

5. **Sorted set for leaderboard:**
   ```bash
   ZADD scores 100 "Alice" 95 "Bob" 90 "Charlie"
   ZREVRANGE scores 0 2 WITHSCORES
   ```

## Observable Outcomes

You'll know you understand Redis data types when you can:
- ✅ Choose the appropriate data type for your use case
- ✅ Understand trade-offs between similar types
- ✅ Perform basic operations on each type
- ✅ Recognize when to use advanced types

## Next Steps

- Deep dive into each data type
- Learn about data modeling patterns
- Explore performance characteristics
- Study real-world use cases
