import NextAuth from 'next-auth'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import Google from 'next-auth/providers/google'
import Apple from 'next-auth/providers/apple'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1)
        if (!user || !user.provider) return null
        // Password stored in refresh_token field for email users
        const [storedHash] = await db
          .select()
          .from(accounts)
          .where(eq(accounts.userId, user.id))
          .limit(1)
        if (!storedHash?.refresh_token) return null
        const valid = await bcrypt.compare(
          credentials.password as string,
          storedHash.refresh_token,
        )
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, image: user.avatarUrl }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token?.id) session.user.id = token.id as string
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Award early adopter badge and signup points
      const { checkAndAwardBadges } = await import('@/lib/badges')
      const { awardPoints } = await import('@/lib/points')
      if (user.id) {
        await awardPoints(user.id, 10)
        await checkAndAwardBadges(user.id)
      }
    },
  },
})
