import 'fastify'

import { Member, Organization } from '@prisma/client'

declare module 'fastify' {
	interface FastifyRequest {
		getCurrentUserId(): Promise<string>
		getUserMemeberShip(
			slug: string,
		): Promise<{ organization: Organization; membership: Member }>
	}
}
