import mongoose, { Schema, SchemaTypes } from "mongoose";
import { ROLES } from "../../utils/enums.js";

const userSchema = new Schema({
    fullName: {
        type: SchemaTypes.String,
        required: true
    },
    username: {
        type: SchemaTypes.String,
        required: true,
        unique: true
    },
    email: {
        type: SchemaTypes.String,
        required: true,
        unique: true
    },
    profileImage: {
        type: SchemaTypes.String,
        default: null
    },
    role: {
        type: SchemaTypes.String,
        enum: Object.values(ROLES),
        default: ROLES.USER
    },
    password: {
        type: SchemaTypes.String
    },
    resetPasswordToken: {
        type: SchemaTypes.String,
        default: null
    },
    resetPasswordExpires: {
        type: SchemaTypes.String,
        default: null
    },
    refreshTokens: [SchemaTypes.String],
    isActive: {
        type: SchemaTypes.Boolean,
        default: false
    },
    activationToken: {
        type: SchemaTypes.String,
        default: null
    },
    activationTokenExpires: {
        type: SchemaTypes.String,
        default: null
    }
});

export default mongoose.model('User', userSchema);