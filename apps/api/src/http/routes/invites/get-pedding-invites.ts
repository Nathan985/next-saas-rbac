import { roleSchema } from '@saas/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'

import { BadRequestError } from '../_errors/bad-request-error'

export function getPeddingInvites(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			'/invites/pedding',
			{
				schema: {
					tags: ['invites'],
					summary: 'Get all user pedding invites',
					security: [{ bearerAuth: [] }],
					response: {
						200: z.object({
							invites: z.array(
								z.object({
									id: z.string().uuid(),
									email: z.string().email(),
									role: roleSchema,
									createdAt: z.date(),
									author: z
										.object({
											id: z.string().uuid(),
											email: z.string().email(),
											name: z.string().nullish(),
										})
										.nullish(),
									organization: z.object({
										name: z.string(),
									}),
								}),
							),
						}),
					},
				},
			},
			async (request, reply) => {
				const userId = await request.getCurrentUserId()

				const user = await prisma.user.findUnique({
					where: {
						id: userId,
					},
				})

				if (!user) {
					throw new BadRequestError('User not found')
				}

				const invites = await prisma.invite.findMany({
					where: {
						email: user.email,
					},
					select: {
						id: true,
						email: true,
						role: true,
						createdAt: true,
						author: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
						organization: {
							select: {
								name: true,
							},
						},
					},
					orderBy: {
						createdAt: 'desc',
					},
				})

				return reply.status(200).send({
					invites,
				})
			},
		)
}
