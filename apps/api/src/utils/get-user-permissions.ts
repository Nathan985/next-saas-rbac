import { defineAbilityFor, Role, userSchema } from '@saas/auth'

export function getuserPermissions(userId: string, role: Role) {
	const authUser = userSchema.parse({
		id: userId,
		role,
	})

	const ability = defineAbilityFor(authUser)

	return ability
}
