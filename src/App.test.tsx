/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./styles/App.css', () => ({}));

jest.mock('./pages/SetupPage', () => ({
  SetupPage: () => <div>Setup page</div>,
}));

jest.mock('./pages/GamePage', () => ({
  GamePage: () => <div>Game page</div>,
}));

describe('App route loading state', () => {
  it('shows accessible feedback until the selected route loads', async () => {
    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading game…');
    expect(await screen.findByText('Setup page')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
