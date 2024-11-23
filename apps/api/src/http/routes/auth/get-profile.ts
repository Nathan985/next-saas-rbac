import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'

import { BadRequestError } from '../_errors/bad-request-error'

export async function getProfile(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			'/profile',
			{
				schema: {
					tags: ['auth'],
					summary: 'Get authenticated user profile',
					security: [{ bearerAuth: [] }],
					response: {
						200: z.object({
							user: z.object({
								id: z.string().uuid(),
								name: z.string().optional().nullable(),
								email: z.string().email(),
								avatarUrl: z.string().url().optional().nullable(),
							}),
						}),
					},
				},
			},
			async (request, reply) => {
				const userId = await request.getCurrentUserId()

				const user = await prisma.user.findUnique({
					select: {
						id: true,
						name: true,
						email: true,
						avatarUrl: true,
					},
					where: { id: userId },
				})

				if (!user) {
					throw new BadRequestError('User not found')
				}

				return reply.status(200).send({ user })
			},
		)
}
