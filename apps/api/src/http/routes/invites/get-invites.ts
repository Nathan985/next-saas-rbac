import { roleSchema } from '@saas/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export function getInvites(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			'/organizations/:slug/invites',
			{
				schema: {
					tags: ['invites'],
					summary: 'Get invites',
					params: z.object({
						slug: z.string(),
					}),
					security: [{ bearerAuth: [] }],
					response: {
						200: z.object({
							invites: z.array(
								z.object({
									id: z.string().uuid(),
									createdAt: z.date(),
									role: roleSchema,
									email: z.string().email(),
									author: z
										.object({
											id: z.string().uuid(),
											name: z.string().nullish(),
										})
										.nullish(),
								}),
							),
						}),
					},
				},
			},
			async (request, reply) => {
				const userId = await request.getCurrentUserId()
				const { slug } = request.params
				const { membership, organization } =
					await request.getUserMemeberShip(slug)

				const { cannot } = getuserPermissions(userId, membership.role)

				if (cannot('get', 'Invite')) {
					throw new UnauthorizedError(
						'You are not allowed to see organization invites',
					)
				}

				const invites = await prisma.invite.findMany({
					where: {
						organizationId: organization.id,
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
