import React, { useState } from 'react';
import { createDonation } from '../donorService';

export default function PostDonation() {
    const [formData, setFormData] = useState({
        itemName: '',
        quantity: '',
        unit: 'kg',
        foodCategory: 'Cooked',
        address: '',
        latitude: '',
        longitude: '',
        expiryTime: '',
    });
    const [file, setFile] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.keys(formData).forEach((key) => data.append(key, formData[key]));
        if (file) data.append('photo', file);

        try {
            // Pass token from your Auth Context/State
            const token = localStorage.getItem('token');
            const result = await createDonation(data, token);
            alert('Donation posted successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to post donation');
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px' }}>
            <h2>Post Surplus Food</h2>
            <form onSubmit={handleSubmit} Date-cy="donor-form">
                <div>
                    <label>Food Item Name</label>
                    <input type="text" name="itemName" onChange={handleChange} required />
                </div>
                <div>
                    <label>Quantity & Unit</label>
                    <input type="number" name="quantity" onChange={handleChange} required />
                    <select name="unit" onChange={handleChange}>
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                        <option value="meals">meals</option>
                        <option value="boxes">boxes</option>
                    </select>
                </div>
                <div>
                    <label>Category</label>
                    <select name="foodCategory" onChange={handleChange}>
                        <option value="Cooked">Cooked Food</option>
                        <option value="Perishable">Perishable Goods</option>
                        <option value="Non-Perishable">Non-Perishable</option>
                        <option value="Bakery">Bakery</option>
                    </select>
                </div>
                <div>
                    <label>Upload Photo (AI / Manual Intake)</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                </div>
                <div>
                    <label>Address</label>
                    <input type="text" name="address" onChange={handleChange} required />
                </div>
                <div>
                    <label>Must be picked up before</label>
                    <input type="datetime-local" name="expiryTime" onChange={handleChange} required />
                </div>
                <button type="submit" style={{ marginTop: '15px' }}>Submit Donation</button>
            </form>
        </div>
    );
}