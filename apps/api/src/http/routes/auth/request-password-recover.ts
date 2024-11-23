import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { prisma } from '@/lib/prisma'

export async function requestPassowrdRecover(app: FastifyInstance) {
	app.withTypeProvider<ZodTypeProvider>().post(
		'/password/recover',
		{
			schema: {
				tags: ['auth'],
				summary: 'Get authenticated user profile',
				body: z.object({
					email: z.string().email(),
				}),
				response: {
					201: z.null(),
				},
			},
		},
		async (request, reply) => {
			const { email } = request.body

			const userFormEmail = await prisma.user.findUnique({
				where: { email },
			})

			if (!userFormEmail) {
				return reply.status(201).send()
			}

			const { id: code } = await prisma.token.create({
				data: {
					type: 'PASSWORD_RECOVER',
					userId: userFormEmail.id,
				},
			})

			console.log('Recover passowrd token: ', code)

			return reply.status(201).send()
		},
	)
}
