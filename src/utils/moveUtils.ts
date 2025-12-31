import toast from 'react-hot-toast';

export const safeMove = (action: () => void) => {
    try {
        action();
    } catch (error: any) {
        toast.error(error.message);
    }
};
