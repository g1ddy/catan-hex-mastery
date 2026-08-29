const baseConfig = require('./dependency-cruiser.cjs');

// Maritime's committed evidence is intentionally production-focused. Test/spec
// modules remain covered by npm test and by the unfiltered dependency-cruiser
// policy used by npm run check:arch / npm run build; they are excluded here only
// so the canonical evidence graph and derived presentation describe production
// coupling without test-only edges overwhelming the layout.
const EVIDENCE_EXCLUDE = '(^|/)(__tests__/.*|.*\\.(test|spec)\\.[cm]?[jt]sx?$)';

module.exports = {
  ...baseConfig,
  options: {
    ...baseConfig.options,
    exclude: EVIDENCE_EXCLUDE,
  },
};
