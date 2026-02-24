/**
 * 특정 이메일 유저를 승인(isApproved: true) 처리합니다.
 * 사용: npx tsx scripts/approve-user.ts 이메일@주소
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { connectToDatabase } from '../lib/mongodb'

const email = process.argv[2]
if (!email) {
  console.error('사용법: npx tsx scripts/approve-user.ts 이메일@주소')
  process.exit(1)
}

async function main() {
  const { db } = await connectToDatabase()
  const result = await db.collection('users').updateOne(
    { email: email.trim() },
    { $set: { isApproved: true, updatedAt: new Date() } }
  )
  if (result.matchedCount === 0) {
    console.error('해당 이메일 사용자를 찾을 수 없습니다:', email)
    process.exit(1)
  }
  console.log('승인 처리 완료:', email)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
