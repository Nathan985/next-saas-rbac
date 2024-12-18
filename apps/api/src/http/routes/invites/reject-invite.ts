import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'

import { BadRequestError } from '../_errors/bad-request-error'

export function rejectInvite(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.post(
			'/invites/:inviteId/reject',
			{
				schema: {
					tags: ['invites'],
					summary: 'Reject an invite',
					params: z.object({
						inviteId: z.string().uuid(),
					}),
					security: [{ bearerAuth: [] }],
					response: {
						204: z.null(),
					},
				},
			},
			async (request, reply) => {
				const userId = await request.getCurrentUserId()
				const { inviteId } = request.params

				const invite = await prisma.invite.findFirst({
					where: {
						id: inviteId,
					},
				})

				if (!invite) {
					throw new BadRequestError('Invite not found or expired')
				}

				const user = await prisma.user.findUnique({
					where: {
						id: userId,
					},
				})

				if (!user) {
					throw new BadRequestError('User not found')
				}

				if (invite.email !== user.email) {
					throw new BadRequestError('Invite email does not match user email')
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
