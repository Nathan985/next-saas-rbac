import { AbilityBuilder } from '@casl/ability'

import { AppAbility } from '.'
import { User } from './models/user'
import { Role } from './roles'

type PermissionByRole = (
	user: User,
	builder: AbilityBuilder<AppAbility>,
) => void

export const permissions: Record<Role, PermissionByRole> = {
	ADMIN: (user, { can, cannot }) => {
		can('manage', 'all')

		cannot(['transfer_ownership', 'update'], 'Organization') // Regra padrão
		can(['transfer_ownership', 'update'], 'Organization', {
			ownerId: { $eq: user.id }, // Exceção para o dono
		})
	},
	MEMBER: (user, { can }) => {
		can('get', 'User')
		can(['create', 'get'], 'Project')
		can(['update', 'delete'], 'Project', { ownerId: { $eq: user.id } })
	},
	BILLING: (_, { can }) => {
		can('manage', 'Billing')
	},
}
