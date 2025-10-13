# Redis as a Document Database

## Overview

Redis can function as a document database using JSON documents and RediSearch for querying. This enables powerful search capabilities while maintaining Redis's performance.

## Prerequisites

Before starting, you should understand:
- Redis keyspace fundamentals
- Basic JSON structure
- Hash data types

## JSON Documents in Redis

### What is Redis JSON?

Redis JSON provides:
- Native JSON storage
- Path-based access to elements
- Atomic operations on JSON
- Efficient memory usage

### Creating JSON Documents

Use `JSON.SET` to create documents:

```bash
JSON.SET "bicycle:0" "." '{"brand": "Velorim", "model": "Jigger", "price": 270, "description": "Small and powerful", "condition": "new"}'
```

The `.` represents the root of the JSON document.

### Reading JSON Documents

Retrieve entire document:
```bash
JSON.GET "bicycle:0"
```

Get specific fields:
```bash
JSON.GET "bicycle:0" $.brand
JSON.GET "bicycle:0" $.price
```

### Updating JSON Documents

Update specific fields:
```bash
JSON.SET "bicycle:0" $.price 250
```

## Creating Search Indexes

### Index Definition

Create an index on JSON documents with searchable fields:

```bash
FT.CREATE idx:bicycle
  ON JSON
  PREFIX 1 bicycle:
  SCHEMA
    $.brand AS brand TEXT WEIGHT 1.0
    $.model AS model TEXT WEIGHT 1.0
    $.description AS description TEXT WEIGHT 1.0
    $.price AS price NUMERIC
    $.condition AS condition TAG SEPARATOR ,
```

### Index Components

- **ON JSON**: Index JSON documents
- **PREFIX**: Only index keys starting with `bicycle:`
- **SCHEMA**: Define searchable fields

### Field Types

- **TEXT**: Full-text search with relevancy
- **NUMERIC**: Range queries and sorting
- **TAG**: Exact match and faceting
- **GEO**: Geographic coordinates

### Field Options

- **WEIGHT**: Relevancy boost (default 1.0)
- **SORTABLE**: Enable sorting by this field
- **NOSTEM**: Disable stemming for text
- **SEPARATOR**: Tag delimiter (default `,`)

## Hands-On Exercises

### Exercise 1: Create Product Catalog

1. Add products as JSON:
   ```bash
   JSON.SET "bicycle:0" "." '{"brand": "Velorim", "model": "Jigger", "price": 270, "condition": "new"}'
   JSON.SET "bicycle:1" "." '{"brand": "Bicyk", "model": "Hillcraft", "price": 1200, "condition": "used"}'
   JSON.SET "bicycle:2" "." '{"brand": "Nord", "model": "Chook air 5", "price": 815, "condition": "used"}'
   ```

2. Create search index:
   ```bash
   FT.CREATE idx:bicycle ON JSON PREFIX 1 bicycle: SCHEMA $.brand AS brand TEXT $.model AS model TEXT $.price AS price NUMERIC $.condition AS condition TAG
   ```

3. Verify index:
   ```bash
   FT.INFO idx:bicycle
   ```

### Exercise 2: Search Queries

**Wildcard query** (get all):
```bash
FT.SEARCH idx:bicycle "*" LIMIT 0 10
```

**Single-term search**:
```bash
FT.SEARCH idx:bicycle "@model:Jigger"
```

**Exact match**:
```bash
FT.SEARCH idx:bicycle '@brand:"Bicyk"'
```

**Numeric range**:
```bash
FT.SEARCH idx:bicycle "@price:[0 500]"
```

**Tag filter**:
```bash
FT.SEARCH idx:bicycle "@condition:{new}"
```

**Combined query**:
```bash
FT.SEARCH idx:bicycle "@condition:{used} @price:[0 1000]"
```

### Exercise 3: Advanced Queries

**Sort by price**:
```bash
FT.SEARCH idx:bicycle "*" SORTBY price ASC
```

**Return specific fields**:
```bash
FT.SEARCH idx:bicycle "*" RETURN 3 $.brand $.model $.price
```

**Count results**:
```bash
FT.SEARCH idx:bicycle "@condition:{used}" LIMIT 0 0
```

## Query Syntax

### Text Search

- `@field:term` - Search in specific field
- `@field:"exact phrase"` - Exact match
- `term1 term2` - AND by default
- `term1 | term2` - OR operator
- `-term` - NOT operator
- `term*` - Prefix match

### Numeric Ranges

- `@price:[100 500]` - Inclusive range
- `@price:[(100 500]` - Exclusive start
- `@price:[100 +inf]` - Open-ended

### Tag Queries

- `@condition:{new}` - Single tag
- `@condition:{new | used}` - Multiple tags (OR)

## Real-World Use Cases

### E-commerce Product Search

```bash
FT.CREATE idx:products ON JSON PREFIX 1 product:
  SCHEMA
    $.name AS name TEXT WEIGHT 5.0
    $.description AS description TEXT
    $.category AS category TAG
    $.price AS price NUMERIC SORTABLE
    $.rating AS rating NUMERIC SORTABLE
    $.in_stock AS in_stock TAG
```

### User Directory

```bash
FT.CREATE idx:users ON JSON PREFIX 1 user:
  SCHEMA
    $.username AS username TEXT NOSTEM SORTABLE
    $.email AS email TEXT NOSTEM
    $.bio AS bio TEXT
    $.location AS location GEO
    $.created_at AS created_at NUMERIC SORTABLE
```

## Performance Tips

### Index Optimization

- **Selective indexing**: Only index fields you'll search
- **SORTABLE overhead**: Adds memory, use sparingly
- **Prefix selection**: Narrow PREFIX to reduce index size
- **Field weights**: Balance relevancy vs performance

### Query Optimization

- **Limit results**: Use LIMIT to reduce response size
- **Return fewer fields**: RETURN only needed fields
- **Avoid wildcard**: Specific queries are faster
- **Use tags for exact match**: TAG is faster than TEXT for exact matches

## Observable Outcomes

You'll know you've mastered Redis as a document database when you can:
- ✅ Store and retrieve JSON documents
- ✅ Create search indexes with appropriate field types
- ✅ Perform text, numeric, and tag queries
- ✅ Combine filters and sorting
- ✅ Optimize indexes for your use case

## Next Steps

After mastering document database:
- Learn aggregation pipelines with FT.AGGREGATE
- Explore vector search for similarity
- Study full-text search ranking
- Implement auto-complete with suggestions
