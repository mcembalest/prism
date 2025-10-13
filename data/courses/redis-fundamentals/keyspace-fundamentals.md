# Keyspace Fundamentals

## Overview

Redis organizes data in a flat keyspace where each key maps to a value. Understanding how to work with keys is the foundation of using Redis effectively.

## Core Concepts

### Keys
- Keys are binary safe strings (can be any binary data)
- Convention: Use colons for namespacing (e.g., `user:1001:profile`)
- Maximum key size: 512 MB (but keep them short!)

### Key Patterns
```
user:1001:profile          # User profile
session:abc123             # Session data
cache:homepage:data        # Cached homepage
product:catalog:item:456   # Product catalog
```

## Essential Commands

### Basic Operations
- `SET key value` - Set a key to a value
- `GET key` - Retrieve value for a key
- `DEL key` - Delete a key
- `EXISTS key` - Check if key exists

### Key Inspection
- `KEYS pattern` - Find keys matching pattern (⚠️ Avoid in production!)
- `SCAN cursor` - Iterate through keys safely
- `TYPE key` - Get the data type of a key
- `TTL key` - Get time-to-live in seconds

### Expiration
- `EXPIRE key seconds` - Set key to expire
- `PERSIST key` - Remove expiration
- `PTTL key` - Get TTL in milliseconds

## Hands-On Exercises

### Exercise 1: Basic Key Operations
1. Connect to Redis: `redis-cli`
2. Set a key: `SET greeting "Hello Redis"`
3. Get the value: `GET greeting`
4. Check if it exists: `EXISTS greeting`
5. Delete it: `DEL greeting`

### Exercise 2: Working with Expiration
1. Set a temporary key: `SET temp:data "expires soon"`
2. Set expiration: `EXPIRE temp:data 60`
3. Check TTL: `TTL temp:data`
4. Remove expiration: `PERSIST temp:data`

### Exercise 3: Key Patterns
1. Create several keys with patterns:
   ```
   SET user:1:name "Alice"
   SET user:2:name "Bob"
   SET product:1:title "Redis Book"
   ```
2. Find user keys: `KEYS user:*`
3. Use SCAN for safer iteration: `SCAN 0 MATCH user:*`

## Observable Outcomes

You'll know you've mastered keyspace fundamentals when you can:
- ✅ Set and retrieve values using appropriate key naming conventions
- ✅ Use SCAN to safely iterate through keys
- ✅ Manage key expiration and TTL
- ✅ Check key existence and types

## Common Pitfalls

- **Using KEYS in production** - It blocks the server! Use SCAN instead
- **Poor key naming** - Use consistent, descriptive patterns
- **Not setting TTL** - Temporary data should expire automatically
- **Very long keys** - Keep keys concise for performance

## Next Steps

After mastering keyspace fundamentals, you're ready to:
- Explore Redis data structures (hashes, lists, sets)
- Learn about data modeling patterns
- Understand when to use different data types
