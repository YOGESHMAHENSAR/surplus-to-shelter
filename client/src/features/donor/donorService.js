import axios from 'axios';

const API_URL = `${import.meta.env.API_URL || ''}/api/donations`;

export const createDonation = async (formData, token) => {
    const config = {
        headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
        },
    };

    const response = await axios.post(API_URL, formData, config);
    return response.data;
};