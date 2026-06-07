import {Hono} from 'hono'
import {zValidator} from '@hono/zod-validator'
import {z} from 'zod'
import {eq} from 'drizzle-orm'
import {db} from '../db/index.js'
import {users} from '../db/schema.js'
import jwt from 'jsonwebtoken'
import {createHash} from 'crypto'

const app = new Hono() // Hono 애플리케이션 인스턴스 생성

// 비밀번호를 해시하는 함수 - SHA-256 알고리즘을 사용하여 비밀번호와 JWT 시크릿을 조합하여 해시 생성
const hashPassword = (password: string) => 
    createHash('sha256').update(password + process.env.JWT_SECRET).digest('hex')

// 회원가입 요청의 유효성을 검사하기 위한 Zod 스키마 정의
const signupSchema = z.object({ 
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).max(100),
})

// 로그인 요청의 유효성을 검사하기 위한 Zod 스키마 정의
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
})

// 회원가입 엔드포인트 - 클라이언트로부터 이메일, 비밀번호, 이름을 받아서 새로운 사용자 생성
app.post('/signup', zValidator('json', signupSchema), async (c) => {
    const { email, password, name } = c.req.valid('json') // 유효성 검사를 통과한 요청 데이터에서 이메일, 비밀번호, 이름 추출


    // 이미 존재하는 이메일인지 확인 - 데이터베이스에서 해당 이메일을 가진 사용자가 있는지 조회
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing.length > 0) {
        return c.json({ error: '이미 사용 중인 이메일입니다' }, 409)
    }


    // 새로운 사용자 생성 - 비밀번호를 해시하여 데이터베이스에 저장하고, JWT 토큰을 생성하여 클라이언트에 반환
    const [user] = await db
        .insert(users)
        .values({email, passwordHash: hashPassword(password), name})
        .returning({id: users.id, email: users.email, name: users.name})


    // JWT 토큰 생성 - 사용자 ID와 이메일을 페이로드로 포함하여 JWT 토큰을 생성하고, 7일 동안 유효하도록 설정
    const token = jwt.sign({userId: user.id, email: user.email}, process.env.JWT_SECRET!, {
        expiresIn: '7d',
    })


    // 회원가입 성공 시 JWT 토큰과 사용자 정보를 클라이언트에 반환
    return c.json({ token, user }, 201)
})

app.post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json') // 유효성 검사를 통과한 요청 데이터에서 이메일과 비밀번호 추출

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1) // 데이터베이스에서 해당 이메일을 가진 사용자를 조회

    if (!user || user.passwordHash !== hashPassword(password)) {
        return c.json({ erorr: '이메일 또는 비밀번호가 올바르지 않습니다' }, 401) // 사용자 존재 여부와 비밀번호 일치 여부를 확인하여 인증 실패 응답 반환
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, { // JWT 토큰 생성 - 사용자 ID와 이메일을 페이로드로 포함하여 JWT 토큰을 생성하고, 7일 동안 유효하도록 설정
        expiresIn: '7d',
    })


    // 로그인 성공 시 JWT 토큰과 사용자 정보를 클라이언트에 반환
    return c.json({
        token,
        user: {id: user.id, email: user.email, name: user.name},
    })
})

export default app
