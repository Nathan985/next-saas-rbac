import { roleSchema } from '@saas/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function updateMember(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.put(
			'/organizations/:slug/members/:memberId',
			{
				schema: {
					tags: ['members'],
					summary: 'update a member',
					params: z.object({
						slug: z.string(),
						memberId: z.string().uuid(),
					}),
					body: z.object({
						role: roleSchema,
					}),
					security: [
						{
							bearerAuth: [],
						},
					],
					response: {
						204: z.null(),
					},
				},
			},
			async (request, reply) => {
				const { slug, memberId } = request.params
				const userid = await request.getCurrentUserId()
				const { membership, organization } =
					await request.getUserMemeberShip(slug)

				const { cannot } = getuserPermissions(userid, membership.role)

				if (cannot('update', 'User')) {
					throw new UnauthorizedError(
						'You are not allowed to update this members',
					)
				}

				const { role } = request.body

				await prisma.member.update({
					where: {
						id: memberId,
						organizationId: organization.id,
					},
					data: {
						role,
					},
				})

				return reply.status(204).send()
			},
		)
}
