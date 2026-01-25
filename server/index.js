import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'

dotenv.config({ path: '../.env' })

const app = express()
const PORT = 3001

// CORS 설정 - 프론트엔드에서 접근 가능하도록
app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Kling AI API Base URL
const KLING_API_BASE = 'https://api.klingai.com/v1'

// JWT 토큰 생성 함수
function generateKlingJWT(accessKey, secretKey) {
  const payload = {
    iss: accessKey,
    exp: Math.floor(Date.now() / 1000) + (30 * 60), // 30분 후 만료
    nbf: Math.floor(Date.now() / 1000) - 5, // 5초 전부터 유효
  }
  
  return jwt.sign(payload, secretKey, { algorithm: 'HS256' })
}

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Kling Proxy Server is running' })
})

// Kling AI API 프록시 - 비디오 생성 작업 생성
app.post('/api/kling/videos/image2video', async (req, res) => {
  try {
    const { accessKey, secretKey, body } = req.body

    console.log('📥 프록시 서버 수신:', {
      hasAccessKey: !!accessKey,
      hasSecretKey: !!secretKey,
      accessKeyPrefix: accessKey ? accessKey.substring(0, 8) + '...' : 'none',
      model: body?.model_name,
    })

    if (!accessKey || !secretKey) {
      console.error('❌ Access Key 또는 Secret Key 누락!')
      return res.status(400).json({ error: 'Both Access Key and Secret Key are required' })
    }

    // JWT 토큰 생성
    const jwtToken = generateKlingJWT(accessKey, secretKey)

    console.log('🔐 JWT 토큰 생성 완료')
    console.log('📤 Kling API 요청:', {
      model: body.model_name,
      duration: body.duration,
      aspectRatio: body.aspect_ratio,
      url: `${KLING_API_BASE}/videos/image2video`,
    })

    // Kling AI API 인증: JWT Bearer 토큰 사용
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    }

    console.log('📋 전송 헤더:', {
      'Authorization': `Bearer ${jwtToken.substring(0, 20)}...`,
    })

    const response = await fetch(`${KLING_API_BASE}/videos/image2video`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Kling API 에러:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
      })
      return res.status(response.status).json(data)
    }

    console.log('✅ Task 생성 완료:', data.data?.task_id)
    res.json(data)
  } catch (error) {
    console.error('❌ 프록시 서버 에러:', error)
    res.status(500).json({ error: error.message })
  }
})

// Kling AI API 프록시 - 작업 상태 확인
app.post('/api/kling/videos/image2video/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params
    const { accessKey, secretKey } = req.body

    if (!accessKey || !secretKey) {
      return res.status(400).json({ error: 'Both Access Key and Secret Key are required' })
    }

    // JWT 토큰 생성
    const jwtToken = generateKlingJWT(accessKey, secretKey)

    const headers = {
      'Authorization': `Bearer ${jwtToken}`,
    }

    const response = await fetch(`${KLING_API_BASE}/videos/image2video/${taskId}`, {
      method: 'GET',
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    // 진행 상황 로그
    const status = data.data?.task_status
    if (status === 'processing') {
      console.log('⏳ 비디오 생성 중...')
    } else if (status === 'succeed') {
      console.log('✅ 비디오 생성 완료!')
    }

    res.json(data)
  } catch (error) {
    console.error('❌ 프록시 서버 에러:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Kling Proxy Server 실행 중: http://localhost:${PORT}`)
  console.log(`📍 헬스체크: http://localhost:${PORT}/health`)
  console.log(`🎬 프론트엔드: http://localhost:5173`)
})
