import toast from 'react-hot-toast';

export const safeMove = (action: () => void): boolean => {
    try {
        action();
        return true;
    } catch (error: unknown) {
        if (error instanceof Error) {
            toast.error(error.message);
        } else if (typeof error === 'string') {
            toast.error(error);
        } else {
            toast.error('An unknown error occurred');
        }
        return false;
    }
};
