import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function analyzeResume({
  resumeContent,
  jobTitle,
  jobDescription,
}: {
  resumeContent: string
  jobTitle?: string
  jobDescription?: string
}): Promise<{
  feedback: string
  tokensUsed: number
}> {
  const contextPart = jobDescription
    ? `아래는 지원할 채용공고입니다. 당신은 해당 기업의 채용 담당자입니다. 이 공고에 맞게 이력서를 분석해주세요.\n\n채용공고:\n${jobDescription}`
    : jobTitle
    ? `지원 직무: ${jobTitle}\n이 직무에 맞게 이력서를 분석해주세요.`
    : `일반적인 관점에서 이력서를 분석해주세요.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `${contextPart}

피드백 구성:
1. **전반적인 평가** (강점 2~3가지)
2. **공고/직무 적합도** (이력서가 얼마나 잘 맞는지)
3. **개선이 필요한 부분** (항목별 구체적 제안)
4. **문장/표현 개선** (어색하거나 임팩트가 부족한 표현 수정)
5. **추가하면 좋을 내용** (공고에서 요구하는데 빠진 내용)

이력서:
---
${resumeContent}
---`,
      },
    ],
  })

  const feedback = message.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('\n')

  const tokensUsed = message.usage.input_tokens + message.usage.output_tokens

  return { feedback, tokensUsed }
}