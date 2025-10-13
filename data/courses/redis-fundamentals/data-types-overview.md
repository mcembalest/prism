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
  "summary": "Learn to store and retrieve fields in Redis hashes with a deep understanding",
  "exercises": [
    {
      "type": "worked-example",
      "title": "Storing User Data",
      "steps": [
        {
          "command": "HSET user:1 name \"Alice\"",
          "narration": "First, we create a hash and set the 'name' field. The key is 'user:1' and we're setting one field.",
          "output": "(integer) 1"
        },
        {
          "command": "HSET user:1 email \"alice@example.com\" age \"30\"",
          "narration": "Now we add more fields to the same hash. HSET can set multiple fields at once.",
          "output": "(integer) 2"
        },
        {
          "command": "HGETALL user:1",
          "narration": "Finally, we retrieve all fields and values from the hash. This shows us the complete object.",
          "output": "1) \"name\"\\n2) \"Alice\"\\n3) \"email\"\\n4) \"alice@example.com\"\\n5) \"age\"\\n6) \"30\""
        }
      ],
      "followUpQuestion": "Why did HSET return (integer) 2 in the second command?",
      "options": [
        "Because there are 2 fields total in the hash",
        "Because we set 2 NEW fields (email and age)",
        "Because it's the 2nd command we ran",
        "Because the hash has 2 keys"
      ],
      "correctIndex": 1,
      "feedback": "Excellent! You understand how HSET works."
    },
    {
      "type": "prediction",
      "command": "HSET user:2 email alice@example.com",
      "question": "What will this command return?",
      "options": [
        "(integer) 0 - field already exists",
        "(integer) 1 - new field created",
        "OK",
        "(error) wrong syntax"
      ],
      "correctIndex": 1,
      "explanation": "HSET returns (integer) 1 when a NEW field is created, and (integer) 0 when updating an existing field.",
      "feedback": "Perfect prediction! Now try it yourself:"
    },
    {
      "type": "command",
      "command": "HSET user:2 email alice@example.com",
      "feedback": "Great! You created a new field in the hash."
    },
    {
      "type": "conceptual-question",
      "question": "You want to increment a user's login count stored in a hash. Which command should you use?",
      "options": [
        "HSET user:1 logins 1",
        "HGET user:1 logins",
        "HINCRBY user:1 logins 1",
        "INCR user:1:logins"
      ],
      "correctIndex": 2,
      "explanation": "HINCRBY is specifically designed to increment numeric fields in a hash. HSET would just set it to 1, losing the previous value.",
      "feedback": "Exactly right! HINCRBY is the way to go.",
      "hint": "Think about commands specific to hashes that handle numeric values"
    },
    {
      "type": "command",
      "command": "HGET user:2 email",
      "feedback": "Excellent! You retrieved a single field from the hash."
    },
    {
      "type": "command",
      "command": "HGETALL user:2",
      "feedback": "Perfect! You can see all fields and values at once."
    },
    {
      "type": "command",
      "command": "HSET product:1 name \"Laptop\" price 999",
      "feedback": "Nice! You can set multiple fields in one command."
    },
    {
      "type": "prediction",
      "command": "HINCRBY product:1 price 50",
      "question": "After running this, what will be the value of the 'price' field?",
      "options": [
        "50",
        "999",
        "1049",
        "(error)"
      ],
      "correctIndex": 2,
      "explanation": "HINCRBY adds 50 to the current value of 999, resulting in 1049.",
      "feedback": "Correct! Now execute it:"
    },
    {
      "type": "command",
      "command": "HINCRBY product:1 price 50",
      "feedback": "Perfect! You incremented a numeric field in the hash."
    },
    {
      "type": "review",
      "reviewTopic": "Hash Operations",
      "question": "Let's review: Which command gets ALL fields and values from a hash?",
      "options": [
        "HGET key",
        "HGETALL key",
        "HKEYS key",
        "GET key"
      ],
      "correctIndex": 1,
      "feedback": "Great memory! HGETALL retrieves everything from a hash.",
      "concept": "hash-retrieval"
    }
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
  "summary": "Master Redis lists with hands-on practice and conceptual understanding",
  "exercises": [
    {
      "type": "conceptual-question",
      "question": "You're building a task queue where new tasks should be added to the end and processed from the beginning. Which operations should you use?",
      "options": [
        "LPUSH to add, LPOP to process",
        "RPUSH to add, LPOP to process",
        "LPUSH to add, RPOP to process",
        "RPUSH to add, RPOP to process"
      ],
      "correctIndex": 1,
      "explanation": "RPUSH adds to the right (end), and LPOP removes from the left (beginning), creating a FIFO queue.",
      "feedback": "Correct! That's a classic FIFO queue pattern.",
      "hint": "Think about First-In-First-Out (FIFO) - where should items be added and removed?"
    },
    {
      "type": "command",
      "command": "LPUSH queue \"task2\"",
      "feedback": "Great! Added to the left (head) of the list."
    },
    {
      "type": "command",
      "command": "RPUSH queue \"task3\"",
      "feedback": "Perfect! Added to the right (tail) of the list."
    },
    {
      "type": "prediction",
      "command": "LRANGE queue 0 -1",
      "question": "What order will the tasks appear in? (queue had 'task1' initially)",
      "options": [
        "task1, task2, task3",
        "task2, task1, task3",
        "task3, task2, task1",
        "task2, task3, task1"
      ],
      "correctIndex": 1,
      "explanation": "LPUSH added task2 to the LEFT of task1, then RPUSH added task3 to the RIGHT, giving us: task2, task1, task3",
      "feedback": "Exactly! Order matters in lists. Now verify:"
    },
    {
      "type": "command",
      "command": "LRANGE queue 0 -1",
      "feedback": "Nice! You can see all items in order."
    },
    {
      "type": "command",
      "command": "LPOP queue",
      "feedback": "Excellent! You removed an item from the left."
    },
    {
      "type": "review",
      "reviewTopic": "List vs Hash",
      "question": "When should you use a List instead of a Hash?",
      "options": [
        "When you need field-value pairs",
        "When you need an ordered collection",
        "When you need unique values",
        "When you need to increment numbers"
      ],
      "correctIndex": 1,
      "feedback": "Perfect! Lists are all about maintaining order.",
      "concept": "data-structure-choice"
    }
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
