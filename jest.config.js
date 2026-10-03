// Two projects so unit tests run without a database:
//   npm run test:unit         -> tests/unit/**        (no DB, no network)
//   npm run test:integration  -> tests/integration/** (real Postgres: the shine_test DB)
// See the "Testing" section of CLAUDE.md.
const tsJestTransform = {
	'^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
};

const shared = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	transform: tsJestTransform,
	moduleFileExtensions: ['ts', 'js', 'json'],
	testMatch: ['**/*.test.ts'],
	clearMocks: true,
};

module.exports = {
	projects: [
		{
			...shared,
			displayName: 'unit',
			roots: ['<rootDir>/tests/unit'],
			setupFilesAfterEnv: ['<rootDir>/tests/helpers/unitSetup.ts'],
		},
		{
			...shared,
			displayName: 'integration',
			roots: ['<rootDir>/tests/integration'],
			globalSetup: '<rootDir>/tests/helpers/globalSetup.ts',
			setupFilesAfterEnv: ['<rootDir>/tests/helpers/integrationSetup.ts'],
		},
	],
};
