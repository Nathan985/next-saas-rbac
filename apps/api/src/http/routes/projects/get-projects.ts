import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export function getProjects(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			'/organizations/:slug/projects',
			{
				schema: {
					tags: ['projects'],
					summary: 'Get all organizations project',
					params: z.object({
						slug: z.string(),
					}),
					security: [{ bearerAuth: [] }],
					response: {
						200: z.object({
							projects: z.array(
								z.object({
									id: z.string().uuid(),
									name: z.string(),
									description: z.string(),
									slug: z.string(),
									ownerId: z.string().uuid(),
									avatarUrl: z.string().url().nullish(),
									organizationId: z.string().uuid(),
									owner: z.object({
										id: z.string().uuid(),
										name: z.string().nullish(),
										avatarUrl: z.string().url().nullish(),
									}),
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

				if (cannot('get', 'Project')) {
					throw new UnauthorizedError(
						'You are not allowed to see organization projects',
					)
				}

				const projects = await prisma.project.findMany({
					where: {
						organizationId: organization.id,
					},
					select: {
						id: true,
						name: true,
						description: true,
						slug: true,
						ownerId: true,
						avatarUrl: true,
						organizationId: true,
						createdAt: true,
						owner: {
							select: {
								id: true,
								name: true,
								avatarUrl: true,
							},
						},
					},
					orderBy: {
						createdAt: 'desc',
					},
				})

				return reply.status(200).send({ projects })
			},
		)
}
