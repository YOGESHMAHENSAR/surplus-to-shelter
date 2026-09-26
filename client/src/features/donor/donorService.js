import axios from 'axios';

const VITE_API_URL = `${import.meta.env.VITE_API_URL || ''}/api/donations`;

export const createDonation = async (formData, token) => {
    const config = {
        headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
        },
    };

    const response = await axios.post(VITE_API_URL, formData, config);
    return response.data;
};