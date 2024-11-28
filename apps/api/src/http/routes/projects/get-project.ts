import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export function getProject(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.get(
			'/organizations/:orgSlug/projects/:orgProject',
			{
				schema: {
					tags: ['projects'],
					summary: 'Get a project details',
					params: z.object({
						orgSlug: z.string(),
						orgProject: z.string(),
					}),
					security: [{ bearerAuth: [] }],
					response: {
						200: z.object({
							project: z.object({
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
						}),
					},
				},
			},
			async (request, reply) => {
				const { orgProject, orgSlug } = request.params
				const userid = await request.getCurrentUserId()
				const { membership, organization } =
					await request.getUserMemeberShip(orgSlug)

				const { cannot } = getuserPermissions(userid, membership.role)

				if (cannot('get', 'Project')) {
					throw new UnauthorizedError('You are not allowed to see this project')
				}

				const project = await prisma.project.findUnique({
					where: {
						slug: orgProject,
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
						owner: {
							select: {
								id: true,
								name: true,
								avatarUrl: true,
							},
						},
					},
				})

				if (!project) {
					throw new BadRequestError('Project not found')
				}

				return reply.status(200).send({ project })
			},
		)
}
