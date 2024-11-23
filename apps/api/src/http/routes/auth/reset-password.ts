import { hash } from 'bcryptjs'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { prisma } from '@/lib/prisma'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function resetPassowrd(app: FastifyInstance) {
	app.withTypeProvider<ZodTypeProvider>().post(
		'/password/reset',
		{
			schema: {
				tags: ['auth'],
				summary: 'Reset user password',
				body: z.object({
					code: z.string(),
					password: z.string().min(6),
				}),
				response: {
					204: z.null(),
				},
			},
		},
		async (request, reply) => {
			const { code, password } = request.body

			const tokenFormCode = await prisma.token.findUnique({
				where: { id: code },
			})

			if (!tokenFormCode) {
				throw new UnauthorizedError()
			}

			const passwordHash = await hash(password, 6)

			await prisma.user.update({
				where: { id: tokenFormCode.userId },
				data: {
					passwordHash,
				},
			})

			return reply.status(204).send()
		},
	)
}
