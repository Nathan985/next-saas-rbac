import { Role } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'

export async function getMembership(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			'/organizations/:slug/membership',
			{
				schema: {
					tags: ['organizations'],
					summary: 'Get user membership on organization',
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					response: {
						200: z.object({
							membership: z.object({
								id: z.string(),
								role: z.nativeEnum(Role),
								organizationId: z.string(),
							}),
						}),
					},
				},
			},
			async (request, reply) => {
				const { slug } = request.params
				const { membership } = await request.getUserMemeberShip(slug)
				return reply.status(200).send({
					membership: {
						id: membership.id,
						role: membership.role,
						organizationId: membership.organizationId,
					},
				})
			},
		)
}
