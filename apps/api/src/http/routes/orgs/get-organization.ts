import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'

export async function getOrganization(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			'/organiztions/:slug',
			{
				schema: {
					tags: ['organizations'],
					summary: 'Get details from organizations',
					security: [{ bearerAuth: [] }],
					params: z.object({
						slug: z.string(),
					}),
					response: {
						200: z.object({
							organization: z.object({
								id: z.string().uuid(),
								name: z.string(),
								slug: z.string(),
								domain: z.string().nullish(),
								shouldAttachUsersByDomain: z.boolean(),
								avatarUrl: z.string().nullish(),
								createdAt: z.date(),
								updatedAt: z.date(),
								ownerId: z.string().uuid(),
							}),
						}),
					},
				},
			},
			async (request, reply) => {
				const { slug } = request.params
				const { organization } = await request.getUserMemeberShip(slug)

				return reply.status(200).send({
					organization,
				})
			},
		)
}
