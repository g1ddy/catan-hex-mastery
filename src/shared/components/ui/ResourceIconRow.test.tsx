/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResourceIconRow } from './ResourceIconRow';

// Mock Lucide icons to avoid rendering issues in JSDOM
jest.mock('lucide-react', () => ({
  Trees: () => <svg data-testid="icon-wood" />,
  BrickWall: () => <svg data-testid="icon-brick" />,
  Cloud: () => <svg data-testid="icon-sheep" />,
  Wheat: () => <svg data-testid="icon-wheat" />,
  Mountain: () => <svg data-testid="icon-ore" />,
}));

describe('ResourceIconRow', () => {
  const mockResources = {
    wood: 1,
    brick: 2,
    sheep: 0,
    wheat: 5,
    ore: 0,
  };

  it('renders all resources with correct counts', () => {
    render(<ResourceIconRow resources={mockResources} />);

    // Check for visible text
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    // Check for zero counts (there are 2 resources with 0: sheep and ore)
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('provides accessible labels for screen readers', () => {
    render(<ResourceIconRow resources={mockResources} />);

    // These queries will fail before the fix, and pass after
    expect(screen.getByLabelText('1 Wood')).toBeInTheDocument();
    expect(screen.getByLabelText('2 Brick')).toBeInTheDocument();
    expect(screen.getByLabelText('0 Sheep')).toBeInTheDocument();
    expect(screen.getByLabelText('5 Wheat')).toBeInTheDocument();
    expect(screen.getByLabelText('0 Ore')).toBeInTheDocument();
  });
});
