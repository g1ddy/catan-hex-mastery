// Define Layer Paths
const L = {
    MECHANICS: '^src/game/mechanics',
    RULES: '^src/game/rules',
    ANALYSIS: '^src/game/analysis',
    MOVES: '^src/game/moves',
    BOTS: '^src/bots',
};

// Groups of layers for easier rule definition
const HIGHER_THAN_MECHANICS = [L.RULES, L.ANALYSIS, L.MOVES, L.BOTS];
const HIGHER_THAN_RULES = [L.ANALYSIS, L.MOVES, L.BOTS];

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
      from: { path: L.MECHANICS },
      to: {
        path: HIGHER_THAN_MECHANICS
      },
      comment: 'Mechanics layer must be pure and not depend on higher layers.',
    },
    /* 2. Rules Layer cannot import from higher layers */
    {
      name: 'rules-layer-violation',
      severity: 'error',
      from: { path: L.RULES },
      to: {
        path: HIGHER_THAN_RULES
      },
      comment: 'Rules layer (Validator/Enumerator) cannot depend on Analysis, Moves, or Bots.',
    },
    /* 3. Evaluation Layer cannot import from Decision layers */
    {
        name: 'evaluation-layer-violation',
        severity: 'error',
        from: { path: L.ANALYSIS },
        to: {
          path: [
              L.MOVES,
              L.BOTS
          ]
        },
        comment: 'Evaluation layer (Coach) evaluates state, not moves or bots.',
    },
    /* 4. Decision Layer (Moves) cannot import from Bots (circular) */
    {
        name: 'moves-layer-violation',
        severity: 'error',
        from: { path: L.MOVES },
        to: {
            path: L.BOTS
        },
        comment: 'Moves are executed by game engine, should not depend on Bots.',
    },
    /* 5. Chain of Command: Moves must use RuleEngine Facade */
    {
        name: 'bypass-rule-facade',
        severity: 'error',
        from: {
            path: [L.MOVES]
        },
        to: {
            path: L.RULES,
            pathNot: [
                '^src/game/rules/validator.ts',
                '^src/game/rules/queries.ts' // Allow Moves to access Queries directly if needed? Or restrict?
            ]
        },
        comment: 'Moves must access rules via the RuleEngine facade (validator.ts) or Query facade (queries.ts).'
    }
  ],
};
