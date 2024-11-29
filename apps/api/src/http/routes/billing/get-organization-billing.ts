import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export function getOrganizationBilling(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			'/organizations/:slug/billing',
			{
				schema: {
					tags: ['billing'],
					summary: 'Get billing information from organization',
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					response: {
						200: z.object({
							billing: z.object({
								seats: z.object({
									amount: z.number(),
									unit: z.number(),
									price: z.number(),
								}),
								projects: z.object({
									amount: z.number(),
									unit: z.number(),
									price: z.number(),
								}),
								total: z.number(),
							}),
						}),
					},
				},
			},
			async (request, reply) => {
				const { slug } = request.params
				const userId = await request.getCurrentUserId()

				const { membership, organization } =
					await request.getUserMemeberShip(slug)

				const { cannot } = getuserPermissions(userId, membership.role)

				if (cannot('get', 'Billing')) {
					throw new UnauthorizedError(
						'You are not allowed to see organization billing',
					)
				}

				const [amountofMembers, amountOfProject] = await Promise.all([
					prisma.member.count({
						where: {
							organizationId: organization.id,
							role: { not: 'BILLING' },
						},
					}),
					prisma.project.count({
						where: {
							organizationId: organization.id,
						},
					}),
				])

				return reply.status(200).send({
					billing: {
						seats: {
							amount: amountofMembers,
							unit: 10,
							price: amountofMembers * 10,
						},
						projects: {
							amount: amountofMembers,
							unit: 20,
							price: amountofMembers * 210,
						},
						total: amountofMembers * 10 + amountOfProject * 20,
					},
				})
			},
		)
}
