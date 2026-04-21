const fs = require('fs');
const content = fs.readFileSync('.jules/archon.md', 'utf8');
const fixed = content.replace(/\\n/g, '\n');
fs.writeFileSync('.jules/archon.md', fixed);
