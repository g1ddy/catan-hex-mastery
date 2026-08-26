# Roadmap

This document tracks unfinished product and maintenance work. Generated complexity evidence belongs in the current maritime artifacts; completed refactoring history remains in git history.

## Full Game Loop

### Trade System

- [ ] Implement the player-to-player trade lifecycle: offer, counter-offer, accept, and reject.
- [ ] Add the trade interface and player notifications.

### Development Cards

- [ ] Add deck management and random shuffling.
- [ ] Add the Buy Development Card move.
- [ ] Implement Knight, Road Building, Year of Plenty, Monopoly, and Victory Point cards.

### Special Awards and Victory

- [ ] Implement continuous-path calculation for Longest Road.
- [ ] Track played Knight cards for Largest Army.
- [ ] Integrate special awards into victory-point calculation and win determination.

## UI Quality

- [ ] Keep NumberToken components legible and consistently styled across supported screen sizes.

## Complexity Stewardship

- [ ] As full-game-loop features are added, keep UI orchestration and decision logic decomposed into focused hooks, helpers, and domain modules rather than creating new monoliths.
- [ ] Reassess extraction opportunities when the generated complexity evidence identifies sustained growth or threshold breaches.
