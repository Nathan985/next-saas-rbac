import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export function removeMember(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.delete(
			'/organizations/:slug/members/:memberId',
			{
				schema: {
					tags: ['members'],
					summary: 'Remove a member',
					params: z.object({
						slug: z.string(),
						memberId: z.string().uuid(),
					}),
					security: [
						{
							bearerAuth: [],
						},
					],
					response: {
						204: {
							type: 'null',
						},
					},
				},
			},
			async (request, reply) => {
				const { slug, memberId } = request.params
				const userid = await request.getCurrentUserId()
				const { membership, organization } =
					await request.getUserMemeberShip(slug)

				const { cannot } = getuserPermissions(userid, membership.role)

				if (cannot('delete', 'User')) {
					throw new UnauthorizedError(
						'You are not allowed to remove this member',
					)
				}

				await prisma.member.delete({
					where: {
						id: memberId,
						organizationId: organization.id,
					},
				})

				return reply.code(204).send()
			},
		)
}
