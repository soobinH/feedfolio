import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import authRouter from './routes/auth.js'
import resumeRouter from './routes/resume.js'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/api/auth', authRouter)
app.route('/api/resumes', resumeRouter)

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: '서버 오류가 발생했습니다' }, 500)
})

const port = Number(process.env.PORT) || 4000
console.log(`서버 시작: http://localhost:${port}`)

serve({ fetch: app.fetch, port })