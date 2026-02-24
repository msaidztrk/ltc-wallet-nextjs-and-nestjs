import axios from 'axios';
import toast from 'react-hot-toast';

export const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        console.error('API Error:', error);

        const errorMessage = error.response?.data?.message || error.message || 'An unexpected networking error occurred';
        const displayedError = Array.isArray(errorMessage) ? errorMessage[0] : errorMessage;

        toast.error(displayedError);

        return Promise.reject(error);
    }
);
