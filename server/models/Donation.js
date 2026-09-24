const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
    {
        donor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        itemName: {
            type: String,
            required: [true, 'Please add a food item name'],
            trim: true,
        },
        quantity: {
            type: Number,
            required: [true, 'Please specify quantity'],
        },
        unit: {
            type: String,
            enum: ['kg', 'lbs', 'servings', 'boxes', 'meals'],
            default: 'kg',
        },
        foodCategory: {
            type: String,
            enum: ['Cooked', 'Perishable', 'Non-Perishable', 'Bakery', 'Raw/Produce'],
            required: true,
        },
        photoUrl: {
            type: String,
            default: '',
        },
        classificationMethod: {
            type: String,
            enum: ['AI', 'MANUAL'],
            default: 'MANUAL',
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
            address: {
                type: String,
                required: true,
            },
        },
        expiryTime: {
            type: Date,
            required: [true, 'Please set an expiration time'],
        },
        status: {
            type: String,
            enum: ['PENDING_MATCH', 'MATCHED', 'DISPATCHED', 'PICKED_UP', 'DELIVERED', 'EXPIRED'],
            default: 'PENDING_MATCH',
        },
    },
    { timestamps: true }
);

// Index for geospatial queries required in Phase 2
donationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Donation', donationSchema);