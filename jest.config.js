export default {
	testEnvironment: 'node',
	transform: {},
	testMatch: [ '<rootDir>/test/**/*.test.js' ],
	collectCoverageFrom: [ 'src/**/*.js' ],
	coverageDirectory: './coverage/',
	coverageReporters: [ 'text', 'text-summary', 'lcov', 'json-summary' ],
	coverageThreshold: {
		global: {
			statements: 100,
			branches: 100,
			functions: 100,
			lines: 100
		}
	},
	moduleNameMapper: {
		'^/_alumna/app\\.js$': '<rootDir>/test/runtime/mocks/app.js',
		'^/_alumna/config\\.js$': '<rootDir>/test/runtime/mocks/config.js',
		'^/_alumna/match\\.js$': '<rootDir>/src/compile/match.js',
	'/components/.+\\.js$': '<rootDir>/test/runtime/mocks/component.js',
	'/middlewares/.+\\.js$': '<rootDir>/test/runtime/mocks/middleware.js'
	}
};
