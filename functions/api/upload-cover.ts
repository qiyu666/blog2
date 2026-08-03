// 封面图上传代理：前端 → 此接口 → imgbb
// API Key 存在服务端环境变量中，前端不可见

import { json, error } from './_helpers'
import { getSession } from './_auth'
import { enforceWriteRateLimit } from './_rate-limit'

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload'

export const onRequestPost: PagesFunction<{ DB: D1Database; IMGBB_API_KEY: string }> = async (context) => {
  const { request, env } = context

  // 1. 鉴权：必须登录
  const { user } = await getSession(request, env.DB)
  if (!user) {
    return error('请先登录', 401)
  }

  // 2. 限流
  const limited = await enforceWriteRateLimit(env.DB, request)
  if (limited) return limited

  // 3. 读取前端发来的 base64 图片
  let body: { image?: string }
  try {
    body = await request.json()
  } catch {
    return error('请求格式错误')
  }

  const base64 = body.image
  if (!base64 || typeof base64 !== 'string') {
    return error('缺少图片数据')
  }

  // 4. 校验大小（base64 字符串长度 ≈ 原始字节 * 4/3，10MB → ~13.3M 字符）
  if (base64.length > 14 * 1024 * 1024) {
    return error('图片过大，请压缩后重试')
  }

  // 5. 从环境变量读取 API Key
  const apiKey = env.IMGBB_API_KEY
  if (!apiKey) {
    return error('图床服务未配置', 500)
  }

  // 6. 转发到 imgbb
  const formData = new FormData()
  formData.append('image', base64)

  const res = await fetch(`${IMGBB_UPLOAD_URL}?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => null)
    return error(errBody?.error?.message || `图床上传失败 (HTTP ${res.status})`, 502)
  }

  const data = await res.json()
  if (!data?.data?.url) {
    return error('图床返回数据异常', 502)
  }

  // 7. 返回图片 URL 给前端
  return json({ url: data.data.url })
}
