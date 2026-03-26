import mongoose, { Schema } from "mongoose";

const memberSchema = new Schema({
    imageUrl: {
        type: String
    },
    firstname: {
        type: String,
        required: true,
    },
    lastname: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String
    },
    adhar_no: {
        type: String
    },
    adhar_image: {
        type: String
    },
    vehicle_list: [{
        category: {
            type: String,
        },
        company: {
            type: String,
        },
        vehicle_no: {
            type: String,
        },
        color: {
            type: String,
        },
    }],
    notificationToken: [
        String
    ],
    access: [
        {
            residency_code: {
                type: String
            },
            role: {
                type: String,
                enum: ['masteradmin', 'admin', 'member', 'employee', 'reception']
            },
            buildingId: {
                type: Array
            },
            houseId: {
                type: Array
            },
            isDeleted: {
                type: Boolean,
                default: false
            },
        }
    ],
    industryAccess: [
        {
            industryId: {
                type: mongoose.Types.ObjectId,
                ref: 'industry'
            },
            role: {
                type: String,
                enum: ['system_owner', 'operations_head', 'staff_member', 'receptionist', 'guest']
            },
            isDeleted: {
                type: Boolean,
                default: false
            },
        }
    ],
    autoApproval: {
        type: Array,
        default: []
    },
    HouseDetails: [
        {
            buildingId: {
                type: mongoose.Types.ObjectId,
                required: true
            },
            houseId: {
                type: mongoose.Types.ObjectId,
                required: true,
                ref: 'House'
            },
            memberType: {
                type: String,
                enum: ['Owner', 'Tenant', ''],
                required: true
            },
            ownername: {
                type: String,
                // required: true
            },
            ownerMobile: {
                type: String,
                // required: true
            }

        }
    ],
    termsAndCondition: {
        accepted: {
            type: Boolean,
            default: false
        },
        date: {
            type: Date,
            default: Date.now
        }
    },
    notificationPreferences: {
        maintenance: { type: Boolean, default: true },
        event: { type: Boolean, default: true },
        notice: { type: Boolean, default: true },
        complaint: { type: Boolean, default: true },
        visitor: { type: Boolean, default: true },
        emergency: { type: Boolean, default: true },
        poll: { type: Boolean, default: true },
        water_bill: { type: Boolean, default: true }
    },
    notificationSounds: {
        visitor: { type: String, default: 'tring_tring' },
        maintenance: { type: String, default: 'door_bell' },
        event: { type: String, default: 'door_bell' },
        notice: { type: String, default: 'door_bell' },
        complaint: { type: String, default: 'door_bell' },
        emergency: { type: String, default: 'door_bell' },
        poll: { type: String, default: 'door_bell' },
        water_bill: { type: String, default: 'tring_tring' }
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: String,
        default: null
    },
    ringtone: {
        type: String,
        default: 'door_bell'
    },
    // v3 Onboarding & Preference Fields
    preferredTheme: {
        type: String,
        enum: ['Light', 'Dark', 'Grey'],
        default: 'Light'
    },
    preferredLanguage: {
        type: String,
        default: 'English'
    },
    city: {
        type: String,
        default: ''
    },
    countryCode: {
        type: String,
        default: '+91'
    },
    onboardingLevel: {
        type: Number,
        default: 0
    },
    isFaceVerified: {
        type: Boolean,
        default: false
    },
    facePhotoUrl: {
        type: String
    }
}, {
    timestamps: true
});

export const Member = mongoose.model("Member", memberSchema);
