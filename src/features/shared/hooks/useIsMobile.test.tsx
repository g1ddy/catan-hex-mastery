import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './useIsMobile';

describe('useIsMobile', () => {
    let matchMediaMock: jest.Mock;

    // We need to store listeners to simulate events
    let listeners: Record<string, Function[]> = {};

    beforeEach(() => {
        listeners = {};

        matchMediaMock = jest.fn().mockImplementation((query) => ({
            matches: false, // Default: Desktop
            media: query,
            onchange: null,
            addListener: jest.fn(), // Deprecated
            removeListener: jest.fn(), // Deprecated
            addEventListener: jest.fn((event: string, handler: Function) => {
                if (!listeners[event]) listeners[event] = [];
                listeners[event].push(handler);
            }),
            removeEventListener: jest.fn((event: string, handler: Function) => {
                if (listeners[event]) {
                    listeners[event] = listeners[event].filter(h => h !== handler);
                }
            }),
            dispatchEvent: jest.fn(),
        }));

        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: matchMediaMock,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return initial state false (Desktop) when query does not match', () => {
        // Setup mock to return false
        matchMediaMock.mockImplementation((_query) => ({
            matches: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        }));

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);
    });

    it('should return initial state true (Mobile) when query matches', () => {
        // Setup mock to return true
        matchMediaMock.mockImplementation((_query) => ({
            matches: true,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        }));

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(true);
    });

    it('should update state when media query matches change', () => {
        let changeHandler: Function | null = null;

        // Setup mock to capture the handler
        matchMediaMock.mockImplementation((_query) => ({
            matches: false, // Start as Desktop
            addEventListener: jest.fn((event, handler) => {
                if (event === 'change') {
                    changeHandler = handler;
                }
            }),
            removeEventListener: jest.fn(),
        }));

        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);

        // Simulate change to Mobile
        expect(changeHandler).toBeTruthy();
        act(() => {
            if (changeHandler) {
                // Simulate event object
                changeHandler({ matches: true });
            }
        });

        expect(result.current).toBe(true);

        // Simulate change back to Desktop
        act(() => {
             if (changeHandler) {
                 changeHandler({ matches: false });
             }
        });

        expect(result.current).toBe(false);
    });
});
