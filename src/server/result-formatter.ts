/**
 * Utilities to produce CSV-like outputs for captured commands without
 * re-executing mutating commands.
 */

export function isReadOnlyCommand(command: string): boolean {
  const op = command.trim().split(/\s+/)[0]?.toUpperCase() || ''
  const readOnlyOps = new Set([
    'GET', 'MGET', 'HGET', 'HGETALL', 'HEXISTS', 'HLEN', 'HKEYS', 'HVALS',
    'LRANGE', 'LLEN', 'LINDEX', 'ZRANGE', 'ZRANGEBYSCORE', 'ZREVRANGE', 'ZCARD', 'ZRANK', 'ZREVRANK',
    'SCARD', 'SMEMBERS', 'SISMEMBER', 'SDIFF', 'SINTER', 'SUNION',
    'EXISTS', 'TYPE', 'TTL', 'PTTL', 'KEYS', 'SCAN', 'GETRANGE', 'STRLEN', 'PING'
  ])
  return readOnlyOps.has(op)
}

export function deriveCsvFromTerminal(output: string): string {
  const trimmed = (output || '').trim()
  // (integer) N
  const intMatch = trimmed.match(/\(integer\)\s+(-?\d+)/i)
  if (intMatch) return intMatch[1]
  // OK
  if (/^OK$/i.test(trimmed)) return 'OK'
  // (nil)
  if (/^\(nil\)$/i.test(trimmed)) return ''
  // Bulk string in quotes
  const bulkMatch = trimmed.match(/^"([\s\S]*)"$/)
  if (bulkMatch) return `"${bulkMatch[1]}"`
  // Arrays: convert `1) "a"\n2) "b"` to CSV "a","b"
  if (/^\d+\)\s/m.test(trimmed)) {
    const items = trimmed.split('\n')
      .map(l => l.trim())
      .map(l => l.replace(/^\d+\)\s*/, ''))
      .map(l => l.replace(/^"|"$/g, ''))
    return items.map(v => `"${v}"`).join(',')
  }
  return trimmed
}

