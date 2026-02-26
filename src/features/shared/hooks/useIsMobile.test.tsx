/**
 * @jest-environment jsdom
 */
/* eslint-disable security/detect-object-injection */
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './useIsMobile';

describe('useIsMobile', () => {
    // Persistent mock object to simulate the singleton MediaQueryList
    const listeners: Record<string, EventListener> = {};

    const mockMQ = {
        matches: false,
        addEventListener: jest.fn((evt: string, cb: EventListener) => {
            listeners[evt] = cb;
        }),
        removeEventListener: jest.fn((evt: string, cb: EventListener) => {
            if (listeners[evt] === cb) {
                delete listeners[evt];
            }
        }),
    };

    beforeAll(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: jest.fn().mockReturnValue(mockMQ),
        });
    });

    beforeEach(() => {
        // Reset state before each test
        mockMQ.matches = false;
        mockMQ.addEventListener.mockClear();
        mockMQ.removeEventListener.mockClear();
        // Clear listeners to ensure clean slate
        for (const key in listeners) delete listeners[key];
    });

    it('should return initial state false (Desktop) when query does not match', () => {
        mockMQ.matches = false;
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);
    });

    it('should return initial state true (Mobile) when query matches', () => {
        mockMQ.matches = true;
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(true);
    });

    it('should update state when media query matches change', () => {
        mockMQ.matches = false;
        const { result } = renderHook(() => useIsMobile());
        expect(result.current).toBe(false);

        // Simulate change to Mobile
        mockMQ.matches = true;
        act(() => {
            const handler = listeners['change'];
            if (handler) {
                // EventListener expects an Event object
                handler({ matches: true } as unknown as Event);
            }
        });
        expect(result.current).toBe(true);

        // Simulate change back to Desktop
        mockMQ.matches = false;
        act(() => {
            const handler = listeners['change'];
            if (handler) {
                handler({ matches: false } as unknown as Event);
            }
        });
        expect(result.current).toBe(false);
    });
});
