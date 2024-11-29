import { projectSchema } from '@saas/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export function updateproject(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.put(
			'/organizations/:slug/projects/:projectId',
			{
				schema: {
					tags: ['projects'],
					summary: 'Update a project',
					body: z.object({
						name: z.string(),
						description: z.string(),
						avatarUrl: z.string().url(),
					}),
					params: z.object({
						slug: z.string(),
						projectId: z.string().uuid(),
					}),
					security: [{ bearerAuth: [] }],
					response: {
						204: z.null(),
					},
				},
			},
			async (request, reply) => {
				const userId = await request.getCurrentUserId()
				const { slug, projectId } = request.params
				const { membership } = await request.getUserMemeberShip(slug)

				const project = await prisma.project.findUnique({
					where: {
						id: projectId,
						organizationId: membership.organizationId,
					},
				})

				if (!project) {
					throw new BadRequestError('Project not found')
				}

				const { cannot } = getuserPermissions(userId, membership.role)
				const authProject = projectSchema.parse(project)

				if (cannot('update', authProject)) {
					throw new UnauthorizedError(
						'You are not allowed to update this project',
					)
				}

				const { description, name, avatarUrl } = request.body

				await prisma.project.update({
					where: {
						id: projectId,
					},
					data: {
						description,
						name,
						avatarUrl,
					},
				})

				return reply.status(204).send()
			},
		)
}
