import { hash } from 'bcryptjs'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'

import { BadRequestError } from '../_errors/bad-request-error'

export async function createAccount(app: FastifyInstance) {
	app.withTypeProvider<ZodTypeProvider>().post(
		'/users',
		{
			schema: {
				summary: 'Create a new account',
				tags: ['auth'],
				body: z.object({
					name: z.string(),
					email: z.string().email(),
					password: z.string().min(6),
				}),
			},
		},
		async (request, reply) => {
			const { email, name, password } = request.body

			const userWithSameEmail = await prisma.user.findUnique({
				where: { email },
			})

			if (userWithSameEmail) {
				throw new BadRequestError('Email already in use')
			}

			const [, domain] = email.split('@')

			const autojoinOrganization = await prisma.organization.findFirst({
				where: {
					domain,
					shouldAttachUsersByDomain: true,
				},
			})

			const passwordHash = await hash(password, 6)

			await prisma.user.create({
				data: {
					name,
					email,
					passwordHash,
					member_on: autojoinOrganization
						? {
								create: {
									organizationId: autojoinOrganization.id,
								},
							}
						: undefined,
				},
			})

			return reply.status(201).send({
				message: 'Account created successfully',
			})
		},
	)
}
