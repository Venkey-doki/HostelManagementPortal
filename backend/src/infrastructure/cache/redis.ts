import { createClient } from "redis";
import { env } from "../../config/env.js";

/**
 * Redis Client - Singleton for caching, rate limiting, refresh token storage
 */

const redisClient = createClient({
	url: env.REDIS_URL,
});

redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.on("connect", () => console.log("Redis connected"));

// Connect on module load
await redisClient.connect();

export const redis = redisClient;
