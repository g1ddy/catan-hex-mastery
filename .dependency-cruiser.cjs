/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  options: {
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
  },
  forbidden: [
    /* 1. Mechanics Layer (Bottom) cannot import from higher layers */
    {
      name: 'mechanics-layer-violation',
      severity: 'error',
      from: { path: '^src/game/mechanics' },
      to: {
        path: [
            '^src/game/rules',
            '^src/game/ai',
            '^src/game/analysis',
            '^src/game/moves',
            '^src/bots'
        ]
      },
      comment: 'Mechanics layer must be pure and not depend on higher layers.',
    },
    /* 2. Rules Layer cannot import from higher layers */
    {
      name: 'rules-layer-violation',
      severity: 'error',
      from: { path: '^src/game/rules' },
      to: {
        path: [
            '^src/game/ai',
            '^src/game/analysis',
            '^src/game/moves',
            '^src/bots'
        ]
      },
      comment: 'Rules layer (Validator) cannot depend on AI, Analysis, or Moves.',
    },
    /* 3. Enumeration Layer cannot import from Decision or Evaluation layers */
    {
        name: 'enumeration-layer-violation',
        severity: 'error',
        from: { path: '^src/game/ai' },
        to: {
          path: [
              '^src/game/analysis', // Enumerator generates moves, doesn't score them
              '^src/game/moves',
              '^src/bots'
          ]
        },
        comment: 'Enumeration layer is for generating moves only.',
    },
    /* 4. Evaluation Layer cannot import from Decision or Enumeration layers */
    {
        name: 'evaluation-layer-violation',
        severity: 'error',
        from: { path: '^src/game/analysis' },
        to: {
          path: [
              '^src/game/ai',
              '^src/game/moves',
              '^src/bots'
          ]
        },
        comment: 'Evaluation layer (Coach) evaluates state, not moves or bots.',
    },
    /* 5. Decision Layer (Moves) cannot import from Bots (circular) */
    {
        name: 'moves-layer-violation',
        severity: 'error',
        from: { path: '^src/game/moves' },
        to: {
            path: '^src/bots'
        },
        comment: 'Moves are executed by game engine, should not depend on Bots.',
    }
  ],
};
