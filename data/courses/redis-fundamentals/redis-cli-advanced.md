# Redis CLI - Advanced Features

## Overview

redis-cli has many powerful features beyond basic commands. This guide covers advanced usage for exporting data, scripting, and monitoring.

## CSV Output

Export Redis data in CSV format for use with spreadsheets or other programs.

### Basic CSV Export

```bash
$ redis-cli --csv LRANGE mylist 0 -1
"d","c","b","a"
```

### Common Use Cases

**Export hash fields:**
```bash
$ redis-cli --csv HGETALL user:1
"name","Alice","age","30","city","New York"
```

**Export sorted set:**
```bash
$ redis-cli --csv ZRANGE leaderboard 0 -1 WITHSCORES
"player1","100","player2","95","player3","90"
```

### Important Notes

- `--csv` flag only works on a single command
- Not for full database exports
- Great for data analysis and reporting
- Can be piped to files: `redis-cli --csv KEYS "user:*" > users.csv`

## Hands-On Exercise

### Exercise 1: Export Data to CSV

1. Create some sample data:
   ```bash
   HSET product:1 name "Laptop" price 999 stock 15
   HSET product:2 name "Mouse" price 25 stock 100
   HSET product:3 name "Keyboard" price 75 stock 50
   ```

2. Export product data:
   ```bash
   redis-cli --csv HGETALL product:1
   redis-cli --csv HGETALL product:2
   redis-cli --csv HGETALL product:3
   ```

3. Save to file:
   ```bash
   redis-cli --csv HGETALL product:1 > product1.csv
   cat product1.csv
   ```

## Piping Commands from Files

Execute multiple Redis commands from a text file:

```bash
$ cat /tmp/commands.txt
SET item:3374 100
INCR item:3374
APPEND item:3374 xxx
GET item:3374

$ cat /tmp/commands.txt | redis-cli
OK
(integer) 101
(integer) 6
"101xxx"
```

### Use Cases

- **Batch operations**: Run many commands at once
- **Scripting**: Automate Redis operations
- **Testing**: Replay command sequences
- **Data migration**: Import/export workflows

## Monitoring Commands

### Continuous Command Execution

Run a command repeatedly with `-r` (repeat) and `-i` (interval):

```bash
# Run 5 times
$ redis-cli -r 5 INCR counter_value
(integer) 1
(integer) 2
(integer) 3
(integer) 4
(integer) 5

# Run indefinitely every second
$ redis-cli -r -1 -i 1 INFO | grep rss_human
used_memory_rss_human:2.71M
used_memory_rss_human:2.73M
used_memory_rss_human:2.73M
```

### Monitoring Use Cases

- Track memory usage over time
- Monitor key expiration
- Watch counter values
- Performance testing

## Raw vs Human-Readable Output

### Raw Output Mode

```bash
$ redis-cli --raw INCR mycounter
9

$ redis-cli INCR mycounter
(integer) 10
```

**When to use:**
- Piping to other commands
- Scripting and automation
- File redirection

### Force Human-Readable

```bash
$ redis-cli --no-raw INCR mycounter
(integer) 11
```

## String Quoting and Escaping

### Double Quotes

Support escape sequences:

```bash
127.0.0.1:6379> SET mykey "Hello\nWorld"
OK
127.0.0.1:6379> GET mykey
Hello
World
```

Available escape sequences:
- `\"` - double-quote
- `\n` - newline
- `\r` - carriage return
- `\t` - tab
- `\\` - backslash

### Single Quotes

Literal strings (minimal escaping):

```bash
127.0.0.1:6379> SET password 'p@ssw0rd!"#$'
OK
```

## Connection Options

### Host and Port

```bash
$ redis-cli -h redis.example.com -p 6390 PING
PONG
```

### Authentication

```bash
$ redis-cli -a myPassword123 PING
PONG
```

**Better:** Use environment variable for security:
```bash
export REDISCLI_AUTH=myPassword123
redis-cli PING
```

### Database Selection

```bash
$ redis-cli -n 1 SET key value
$ redis-cli -n 2 SET key value
```

## Observable Outcomes

You'll know you've mastered Redis CLI advanced features when you can:
- ✅ Export data to CSV format
- ✅ Run batch commands from files
- ✅ Monitor Redis with continuous commands
- ✅ Handle string escaping correctly
- ✅ Use connection options effectively

## Next Steps

After mastering Redis CLI:
- Explore Redis scripting with Lua
- Learn about Redis pub/sub
- Dive into Redis performance optimization
