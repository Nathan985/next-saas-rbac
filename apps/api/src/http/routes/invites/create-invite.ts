import { roleSchema } from '@saas/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getuserPermissions } from '@/utils/get-user-permissions'

import { BadRequestError } from '../_errors/bad-request-error'
import { UnauthorizedError } from '../_errors/unauthorized-error'

export function createInvite(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.post(
			'/organizations/:slug/invites',
			{
				schema: {
					tags: ['invites'],
					summary: 'Create a new invite',
					security: [{ bearerAuth: [] }],
					body: z.object({
						email: z.string().email(),
						role: roleSchema,
					}),
					params: z.object({
						slug: z.string(),
					}),
					response: {
						201: z.object({
							inviteId: z.string(),
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

				if (cannot('create', 'Invite')) {
					throw new UnauthorizedError(
						'You do not have permission to create an invite',
					)
				}

				const { email, role } = request.body

				const [, domain] = email.split('@')

				if (
					organization.shouldAttachUsersByDomain &&
					organization.domain === domain
				) {
					throw new BadRequestError(
						`Users with "${domain}" domain will join your organization automatically on login`,
					)
				}

				const inviteWithSameEmail = await prisma.invite.findUnique({
					where: {
						email_organizationId: {
							email,
							organizationId: organization.id,
						},
					},
				})

				if (inviteWithSameEmail) {
					throw new BadRequestError('An invite with this email already exists')
				}

				const memberWithSameEmail = await prisma.member.findFirst({
					where: {
						organizationId: organization.id,
						user: {
							email,
						},
					},
				})

				if (memberWithSameEmail) {
					throw new BadRequestError(
						'A member with this email already belongs to the organization',
					)
				}

				const invite = await prisma.invite.create({
					data: {
						organizationId: organization.id,
						email,
						authorId: userId,
						role,
					},
				})

				return reply.status(201).send({ inviteId: invite.id })
			},
		)
}
