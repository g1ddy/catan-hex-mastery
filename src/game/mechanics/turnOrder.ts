export function getSnakeDraftOrder(numPlayers: number): string[] {
  const order: string[] = [];

  // Forward pass: 0 -> N-1
  for (let i = 0; i < numPlayers; i++) {
    order.push(i.toString());
  }

  // Backward pass: N-1 -> 0
  for (let i = numPlayers - 1; i >= 0; i--) {
    order.push(i.toString());
  }

  return order;
}
