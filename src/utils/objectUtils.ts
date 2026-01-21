
/**
 * Safely checks if a key exists on an object using Object.prototype.hasOwnProperty.call
 */
export function safeCheck<T>(obj: Record<string, T> | unknown, key: string): boolean {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Safely gets a value from an object if the key exists.
 */
export function safeGet<T>(obj: Record<string, T>, key: string): T | undefined {
    if (safeCheck(obj, key)) {
        // eslint-disable-next-line security/detect-object-injection
        return obj[key];
    }
    return undefined;
}

/**
 * Safely sets a value on an object, preventing prototype pollution.
 */
export function safeSet<T>(obj: Record<string, T>, key: string, value: T): void {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return;
    }
    // eslint-disable-next-line security/detect-object-injection
    obj[key] = value;
}
