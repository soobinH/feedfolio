import { createMiddleware } from "hono/factory"
import Redis from "ioredis"

// Redis 클라이언트 초기화
const redis = new Redis(process.env.REDIS_URL!)

const DAILY_LIMIT = 5 // 하루 최대 요청 수
const WINDOW_SECOND = 24 * 60 * 60 // 24시간

export const rateLimitMiddleware = createMiddleware<{
    Variables: { userId: string }
}>(async (c, next) => {
    const userId = c.get('userId')
    const key = `rate_limit:${userId}:${new Date().toISOString().slice(0, 10)}` // 예: rate_limit:123e4567-e89b-12d3-a456-426614174000:2024-06-01

    const count = await redis.incr(key) // 요청 수 증가
    if (count === 1) {
        await redis.expire(key, WINDOW_SECOND) // 첫 요청 시 키의 만료 시간 설정
    }

    // 요청 수가 하루 한도를 초과하면 429 Too Many Requests 응답 반환
    if (count > DAILY_LIMIT) {
        return c.json(
            {
                error: `하루 첨삭 한도(${DAILY_LIMIT}회)를 초과했습니다. 내일 다시 시도해주세요.`,
                remaining: 0,
            },
            429
        )
    }

    c.header('X-RateLimit-Remaining', String(DAILY_LIMIT - count)) // 남은 요청 수를 응답 헤더에 포함
    await next()
})