import { roleSchema } from '@saas/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function getMembers(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			'/organizations/:slug/members',
			{
				schema: {
					tags: ['members'],
					summary: 'Get all organization members',
					params: z.object({
						slug: z.string(),
					}),
					security: [
						{
							bearerAuth: [],
						},
					],
					response: {
						200: z.object({
							members: z.array(
								z.object({
									id: z.string().uuid(),
									name: z.string().nullish(),
									role: roleSchema,
									avatarUrl: z.string().url().nullish(),
									email: z.string().email(),
									userId: z.string().uuid(),
								}),
							),
						}),
					},
				},
			},
			async (request, reply) => {
				const { slug } = request.params
				const userid = await request.getCurrentUserId()
				const { membership, organization } =
					await request.getUserMemeberShip(slug)

				const { cannot } = getuserPermissions(userid, membership.role)

				if (cannot('get', 'User')) {
					throw new UnauthorizedError(
						'You are not allowed to see organization members',
					)
				}

				const members = await prisma.member.findMany({
					where: {
						organizationId: organization.id,
					},
					select: {
						id: true,
						role: true,
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								avatarUrl: true,
							},
						},
					},
					orderBy: {
						role: 'asc',
					},
				})

				const membersWithRoles = members.map(
					({ user: { id, ...user }, ...member }) => ({
						...member,
						...user,
						userId: id,
					}),
				)

				return reply.status(200).send({ members: membersWithRoles })
			},
		)
}
