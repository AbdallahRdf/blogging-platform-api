import mongoose, { Schema, SchemaTypes } from "mongoose";
import { Roles } from "../enums/user.enums";

export interface IUser {
    fullName: string;
    username: string;
    email: string;
    profileImage: string | null;
    bio: string | null;
    role: Roles;
    password: string;
    resetPasswordToken: string | null;
    resetPasswordExpires: number | null; // Timestamp in milliseconds
    refreshTokens: string[]; // Array of refresh tokens for multiple sessions
}

const userSchema = new Schema<IUser>({
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
    bio: {
        type: SchemaTypes.String,
        default: null
    },
    role: {
        type: SchemaTypes.String,
        enum: Object.values(Roles),
        default: Roles.USER
    },
    password: {
        type: SchemaTypes.String,
        required: true
    },
    resetPasswordToken: {
        type: SchemaTypes.String,
        default: null
    },
    resetPasswordExpires: {
        type: SchemaTypes.Number, // Timestamp in milliseconds
        default: null
    },
    refreshTokens: [SchemaTypes.String] // Array of refresh tokens for multiple sessions
}, {
    timestamps: true,
});

userSchema.index({ username: 1 });

export default mongoose.model<IUser>('User', userSchema);