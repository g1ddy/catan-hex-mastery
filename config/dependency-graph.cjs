/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  extends: './dependency-cruiser.cjs',
  options: {
    // Graph generation specific options
    includeOnly: '^src',
    exclude: '(\\.test\\.ts|\\.test\\.tsx|\\.spec\\.ts|testUtils\\.ts)$',
    tsPreCompilationDeps: 'specify',
    reporterOptions: {
      dot: {
        theme: {
          dependencies: [
            {
              criteria: { preCompilationOnly: true },
              attributes: { style: 'dashed', color: '#aaaaaa' },
            },
          ],
        },
      },
    },
  },
  // No rules enforced for graph generation
  forbidden: [],
};
