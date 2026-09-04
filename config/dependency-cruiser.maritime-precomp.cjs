const config = require('./dependency-cruiser.maritime.cjs');

// Experimental evidence profile used only by the compact graph comparison.
// `specify` preserves which TypeScript relationships exist solely because
// dependency-cruiser followed pre-compilation/type information so the renderer
// can reproduce the historical dashed/secondary edge treatment.
module.exports = {
  ...config,
  options: {
    ...config.options,
    tsPreCompilationDeps: 'specify',
  },
};
