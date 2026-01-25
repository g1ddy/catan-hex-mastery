/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  options: {
    // Resolution options inherited from main config for accuracy
    doNotFollow: {
      path: 'node_modules',
    },
    moduleSystems: ['cjs', 'es6'],
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.app.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
      },
    },

    // Graph generation specific options
    includeOnly: '^src',
    exclude: '(\\.test\\.ts|\\.test\\.tsx|\\.spec\\.ts|testUtils\\.ts)$',
  },
  // No rules enforced for graph generation
  forbidden: [],
};
