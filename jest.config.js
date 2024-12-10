/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    maxWorkers: 1,
    collectCoverageFrom: ['src/**/*.ts'],
    collectCoverage: true,
    roots: ['tests'],
};
