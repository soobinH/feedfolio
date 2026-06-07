import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { resumes, feedbacks } from '../db/schema.js'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import { analyzeResume } from '../services/ai.js'

type Variables = { userId: string; email: string }

const app = new Hono<{ Variables: Variables }>()

app.use('*', authMiddleware)

app.post('/upload', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{
    fileName: string
    content: string
    jobTitle?: string
    jobDescription?: string
  }>()

  if (!body.content || body.content.trim().length < 50) {
    return c.json({ error: '이력서 내용이 너무 짧습니다 (최소 50자)' }, 400)
  }

  const [resume] = await db
    .insert(resumes)
    .values({
      userId,
      fileName: body.fileName || '이력서',
      content: body.content.trim(),
    })
    .returning()

  return c.json({ resume }, 201)
})

app.get('/', async (c) => {
  const userId = c.get('userId')
  const list = await db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.createdAt))

  return c.json({ resumes: list })
})

app.get('/:id', async (c) => {
  const userId = c.get('userId')
  const resumeId = c.req.param('id')

  const [resume] = await db
    .select()
    .from(resumes)
    .where(eq(resumes.id, resumeId))
    .limit(1)

  if (!resume || resume.userId !== userId) {
    return c.json({ error: '이력서를 찾을 수 없습니다' }, 404)
  }

  const feedbackList = await db
    .select()
    .from(feedbacks)
    .where(eq(feedbacks.resumeId, resumeId))
    .orderBy(desc(feedbacks.createdAt))

  return c.json({ resume, feedbacks: feedbackList })
})

app.post('/:id/analyze', rateLimitMiddleware, async (c) => {
  const userId = c.get('userId')
  const resumeId = c.req.param('id')

  type AnalyzeBody = { jobTitle?: string; jobDescription?: string }
  const body = await c.req.json<AnalyzeBody>().catch(() => ({} as AnalyzeBody))

  const [resume] = await db
    .select()
    .from(resumes)
    .where(eq(resumes.id, resumeId))
    .limit(1)

  if (!resume || resume.userId !== userId) {
    return c.json({ error: '이력서를 찾을 수 없습니다' }, 404)
  }

  try {
    const { feedback, tokensUsed } = await analyzeResume({
      resumeContent: resume.content,
      jobTitle: body.jobTitle,
      jobDescription: body.jobDescription,
    })

    const [saved] = await db
      .insert(feedbacks)
      .values({ resumeId, userId, content: feedback, tokensUsed })
      .returning()

    return c.json({ feedback: saved })
  } catch (err) {
    console.error('AI 분석 오류:', err)
    return c.json({ error: 'AI 분석 중 오류가 발생했습니다.' }, 500)
  }
})

export default app