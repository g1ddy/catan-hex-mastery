import toast from 'react-hot-toast';

export const safeMove = (action: () => void): boolean => {
    try {
        action();
        return true;
    } catch (error: any) {
        toast.error(error.message);
        return false;
    }
};
