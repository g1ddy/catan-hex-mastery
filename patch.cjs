const fs = require('fs');
const content = fs.readFileSync('src/features/coach/logic/coachUtils.ts', 'utf8');
const newContent = content.replace(
`        case 'settlement':
        default: {
            if (typeof coach.getAllSettlementScores === 'function') {
                return coach.getAllSettlementScores(playerID, ctx);
            }
            break;
        }`,
`        case 'settlement': {
            if (typeof coach.getAllSettlementScores === 'function') {
                return coach.getAllSettlementScores(playerID, ctx);
            }
            break;
        }
        default:
            break;`
);
fs.writeFileSync('src/features/coach/logic/coachUtils.ts', newContent);
