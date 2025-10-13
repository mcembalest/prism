# Search Index Modeling

## Overview

RediSearch adds powerful full-text search and querying capabilities to Redis. This module covers how to model and query searchable data.

## Prerequisites

Before starting this module, you should understand:
- Redis keyspace fundamentals
- Working with Redis hashes
- Basic indexing concepts

## Core Concepts

### What is RediSearch?

RediSearch is a Redis module that enables:
- Full-text search with stemming and tokenization
- Numeric and geo-spatial filtering
- Auto-complete and suggestions
- Aggregations and faceting

### Index Schema

An index defines what fields are searchable and how:
- **TEXT** - Full-text searchable fields
- **NUMERIC** - Numeric range queries
- **TAG** - Exact-match faceted search
- **GEO** - Geographic coordinates

## Creating an Index

### Basic Index Creation

```bash
FT.CREATE products:idx
  ON HASH PREFIX 1 product:
  SCHEMA
    title TEXT WEIGHT 2.0
    description TEXT
    price NUMERIC SORTABLE
    category TAG SORTABLE
```

This creates an index named `products:idx` that:
- Indexes all hash keys starting with `product:`
- Makes `title` and `description` searchable as text
- Allows numeric filtering on `price`
- Enables faceting by `category`

### Field Options

- **SORTABLE** - Enable sorting by this field
- **NOINDEX** - Store but don't index (for computed values)
- **WEIGHT** - Boost relevance (for TEXT fields)

## Hands-On Exercises

### Exercise 1: Create a Product Search Index

1. Create some sample products:
   ```bash
   HSET product:1 title "Redis in Action" description "Learn Redis through examples" price 29.99 category "books"
   HSET product:2 title "Redis T-Shirt" description "Comfortable cotton shirt" price 19.99 category "apparel"
   HSET product:3 title "Redis Sticker Pack" description "10 awesome Redis stickers" price 4.99 category "accessories"
   ```

2. Create the search index:
   ```bash
   FT.CREATE products:idx ON HASH PREFIX 1 product: SCHEMA title TEXT WEIGHT 2.0 description TEXT price NUMERIC SORTABLE category TAG SORTABLE
   ```

3. Verify the index: `FT.INFO products:idx`

### Exercise 2: Search and Filter

1. Search for "redis":
   ```bash
   FT.SEARCH products:idx "redis"
   ```

2. Filter by price range:
   ```bash
   FT.SEARCH products:idx * FILTER price 0 20
   ```

3. Search with category filter:
   ```bash
   FT.SEARCH products:idx "@category:{books}"
   ```

### Exercise 3: Aggregations

Count products by category:
```bash
FT.AGGREGATE products:idx * GROUPBY 1 @category REDUCE COUNT 0 AS count
```

## Observable Outcomes

You'll know you've mastered search indexing when you can:
- ✅ Design appropriate index schemas for different use cases
- ✅ Create indexes with correct field types and options
- ✅ Perform text searches with filters
- ✅ Use aggregations for faceting and analytics

## Common Patterns

### E-commerce Search
```bash
FT.CREATE products:idx ON HASH PREFIX 1 product:
  SCHEMA
    name TEXT WEIGHT 5.0
    description TEXT
    brand TEXT
    price NUMERIC SORTABLE
    category TAG SORTABLE
    rating NUMERIC SORTABLE
    in_stock TAG
```

### User Search
```bash
FT.CREATE users:idx ON HASH PREFIX 1 user:
  SCHEMA
    username TEXT NOSTEM SORTABLE
    email TEXT NOSTEM
    bio TEXT
    location GEO
    created_at NUMERIC SORTABLE
```

## Performance Considerations

- **Index size** - Indexes consume memory; be selective about what to index
- **SORTABLE fields** - Add memory overhead but enable sorting
- **Prefix indexing** - Use specific prefixes to limit what gets indexed
- **Stopwords** - Common words that are filtered out during indexing

## Next Steps

After mastering search indexing, explore:
- Advanced query syntax (wildcards, fuzzy matching, phrases)
- Document ranking and scoring
- Auto-complete with suggestions
- Real-time index updates
