import request from 'supertest'
import { describe, it, expect, beforeAll } from 'vitest'
import app from '../app'

const rand = Math.floor(Math.random() * 1e6)
const email = `tester${rand}@example.com`
const password = 'secret123'

let token = ''

describe('POST /api/conversations/send', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email, name: 'Tester', password })
      .expect(201)

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200)
    token = login.body.token
    expect(token).toBeTruthy()
  })

  it('should store and return message even if WhatsApp fails (fail-open in test)', async () => {
    const res = await request(app)
      .post('/api/conversations/send')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '5511999000000', text: 'Teste via unidade' })
      .expect(200)

    expect(res.body).toHaveProperty('message')
    expect(res.body.message).toHaveProperty('messageText', 'Teste via unidade')
    expect(res.body).toHaveProperty('conversation')
  })
})

