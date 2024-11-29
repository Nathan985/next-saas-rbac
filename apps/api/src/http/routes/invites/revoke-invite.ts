import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export function revokeInvite(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.delete(
			'/organizations/:slug/invites/:inviteId',
			{
				schema: {
					tags: ['invites'],
					summary: 'Revoke an invite',
					params: z.object({
						inviteId: z.string().uuid(),
						slug: z.string(),
					}),
					security: [{ bearerAuth: [] }],
					response: {
						204: z.null(),
					},
				},
			},
			async (request, reply) => {
				const { inviteId, slug } = request.params
				const userId = await request.getCurrentUserId()
				const { membership, organization } =
					await request.getUserMemeberShip(slug)

				const { cannot } = getuserPermissions(userId, membership.role)

				if (cannot('delete', 'Invite')) {
					throw new UnauthorizedError('You are not allowed to delete an invite')
				}

				const invite = await prisma.invite.findFirst({
					where: {
						id: inviteId,
						organizationId: organization.id,
					},
				})

				if (!invite) {
					throw new BadRequestError('Invite not found or expired')
				}

				await prisma.invite.delete({
					where: {
						id: invite.id,
					},
				})

				return reply.status(204).send()
			},
		)
}
