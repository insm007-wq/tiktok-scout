/**
 * Redis client utility for recrawl service and other operations
 * Works with BullMQ's searchQueue to perform Redis operations
 * (Stores rate limit and lock data)
 */

import { searchQueue } from './search-queue';
import type { RedisClient } from 'bullmq';

/**
 * Get Redis client from searchQueue
 * Returns a typed client that can execute Redis commands
 * This client is managed by BullMQ and should not be closed manually
 */
export async function getRedisClient(): Promise<RedisClient> {
  try {
    // Access the client that BullMQ manages
    // This will return the underlying Redis client connection
    const client = await searchQueue.client;

    if (!client) {
      throw new Error('Failed to get Redis client from search queue');
    }

    return client as RedisClient;
  } catch (error) {
    console.error('[Redis Client] Error:', error);
    throw error;
  }
}

/**
 * Close Redis client connection
 * Note: In production, we don't close the queue's client as it's shared
 * The client lifecycle is managed by BullMQ
 */
export async function closeRedisClient(): Promise<void> {
  // No-op: The queue manages its own connection lifecycle
  console.log('[Redis Client] Cleanup (no-op for BullMQ managed connection)');
}
