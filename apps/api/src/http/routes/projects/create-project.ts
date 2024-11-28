import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/utils/create-slug'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export function createProject(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.post(
			'/organizations/:slug/projects',
			{
				schema: {
					tags: ['projects'],
					summary: 'Create a new project',
					security: [
						{
							bearerAuth: [],
						},
					],
					body: z.object({
						name: z.string(),
						description: z.string(),
					}),
					params: z.object({
						slug: z.string(),
					}),
					response: {
						201: z.object({
							projectId: z.string().uuid(),
						}),
					},
				},
			},
			async (request, reply) => {
				const userId = await request.getCurrentUserId()
				const { slug } = request.params

				const { membership, organization } =
					await request.getUserMemeberShip(slug)
				const { description, name } = request.body

				const { cannot } = getuserPermissions(userId, membership.role)

				if (cannot('create', 'Project')) {
					throw new UnauthorizedError(
						'You are not allowed to create projects in this organization',
					)
				}

				const project = await prisma.project.create({
					data: {
						name,
						slug: createSlug(name),
						description,
						organizationId: organization.id,
						ownerId: userId,
					},
				})

				return reply.status(201).send({
					projectId: project.id,
				})
			},
		)
}
