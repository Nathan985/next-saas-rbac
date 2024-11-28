import { organizationSchema } from '@saas/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'
export async function TransferOrganization(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.patch(
			'/organizations/:slug/owner',
			{
				schema: {
					params: z.object({
						slug: z.string(),
					}),
					tags: ['organizations'],
					summary: 'Transfer organization ownership',
					body: z.object({
						transferToUserId: z.string().uuid(),
					}),
					security: [{ bearerAuth: [] }],
					response: {
						204: z.null(),
					},
				},
			},
			async (request, reply) => {
				const { slug } = request.params
				const { transferToUserId } = request.body
				const userId = await request.getCurrentUserId()
				const { membership, organization } =
					await request.getUserMemeberShip(slug)

				const { cannot } = getuserPermissions(userId, membership.role)

				const authOrganization = organizationSchema.parse(organization)

				if (cannot('transfer_ownership', authOrganization)) {
					throw new UnauthorizedError(
						'You are not allowed to transfer ownership of this organization',
					)
				}

				const transferToMembership = await prisma.member.findUnique({
					where: {
						organizationId_userId: {
							organizationId: organization.id,
							userId: transferToUserId,
						},
					},
				})

				if (!transferToMembership) {
					throw new BadRequestError('User is not a member of this organization')
				}

				await prisma.$transaction([
					prisma.member.update({
						where: {
							organizationId_userId: {
								organizationId: organization.id,
								userId: transferToUserId,
							},
						},
						data: {
							role: 'ADMIN',
						},
					}),

					prisma.member.update({
						where: {
							organizationId_userId: {
								organizationId: organization.id,
								userId,
							},
						},
						data: {
							role: 'MEMBER',
						},
					}),

					prisma.organization.update({
						where: { id: organization.id },
						data: {
							ownerId: transferToUserId,
						},
					}),
				])

				return reply.status(204).send()
			},
		)
}
