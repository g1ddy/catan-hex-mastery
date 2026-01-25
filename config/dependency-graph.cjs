/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  extends: './dependency-cruiser.cjs',
  options: {
    // Graph generation specific options
    includeOnly: '^src',
    exclude: '(\\.test\\.ts|\\.test\\.tsx|\\.spec\\.ts|testUtils\\.ts)$',
  },
  // No rules enforced for graph generation
  forbidden: [],
};
