/**
 * Stand-in for src/config/supabase.ts. No test may reach Supabase.
 *
 * supabaseAdmin.auth.getUser(token) accepts tokens of the form
 * `test-token:<userId>` and resolves them to that user; anything else is
 * rejected the way Supabase rejects a bad JWT (error set, user null).
 */
export const TEST_TOKEN_PREFIX = 'test-token:';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function tokenFor(userId: string): string {
	return `${TEST_TOKEN_PREFIX}${userId}`;
}

type GetUserResult = {
	data: { user: { id: string; email: string } | null };
	error: { message: string; status: number } | null;
};

export function createSupabaseMock() {
	const getUser = jest.fn(async (token: string): Promise<GetUserResult> => {
		if (typeof token === 'string' && token.startsWith(TEST_TOKEN_PREFIX)) {
			const id = token.slice(TEST_TOKEN_PREFIX.length);
			if (UUID.test(id)) {
				return { data: { user: { id, email: `${id}@test.invalid` } }, error: null };
			}
		}
		return {
			data: { user: null },
			error: { message: 'invalid JWT: unable to parse or verify signature', status: 401 },
		};
	});

	const unavailable = (name: string) =>
		jest.fn(async () => {
			throw new Error(`Supabase ${name} is not available in tests`);
		});

	return {
		supabaseAdmin: {
			auth: {
				getUser,
				admin: {
					createUser: unavailable('admin.createUser'),
					deleteUser: unavailable('admin.deleteUser'),
					updateUserById: unavailable('admin.updateUserById'),
					generateLink: unavailable('admin.generateLink'),
				},
			},
		},
		supabaseAuth: {
			auth: {
				signInWithPassword: unavailable('signInWithPassword'),
				signUp: unavailable('signUp'),
				signOut: unavailable('signOut'),
				refreshSession: unavailable('refreshSession'),
				resetPasswordForEmail: unavailable('resetPasswordForEmail'),
				updateUser: unavailable('updateUser'),
			},
		},
	};
}
