// 토큰 기반 인증을 위한 미들웨어 구현

import { createMiddleware } from 'hono/factory'
import jwt from 'jsonwebtoken'

type JwtPayload = { userId: string; email: string } // 데이터 타입 정의


// 미들웨어 정의 - 요청에서 JWT 토큰을 검증하고, 유효한 경우 사용자 정보를 컨텍스트에 저장
export const authMiddleware = createMiddleware<{
    Variables: { userId: string; email: string }
}>(async (c, next) => {
    // 요청 헤더에서 Authorization 값을 가져옴
    const authHeader = c.req.header('Authorization')
    // Authorization 헤더가 없거나 "Bearer "로 시작하지 않으면 인증 실패 응답 반환
    if(!authHeader?.startsWith('Bearer ')) { 
        return c.json({error: '인증이 필요합니다'}, 401)
    }

    // "Bearer " 접두어를 제거하여 토큰 추출
    const token = authHeader.slice(7)
    try {
        // 토큰이 진짜인지 검증하고, 페이로드에서 사용자 ID와 이메일을 추출
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
        c.set('userId', payload.userId)
        c.set('email', payload.email)
        await next()
    } catch (error) {
        return c.json({error: '유효하지 않은 토큰입니다'}, 401)
    }  
})
