import mongoose, { Schema, SchemaTypes } from "mongoose";
import { Document } from "mongoose";

export interface ILike {
    user: mongoose.Types.ObjectId;
    post: mongoose.Types.ObjectId;
    comment?: mongoose.Types.ObjectId
}

export interface ILikeDocument extends ILike, Document {}

const likeSchema = new Schema<ILikeDocument>({
    user: {
        type: SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    },
    post: {
        type: SchemaTypes.ObjectId,
        ref: 'Post',
        required: true
    },
    comment: {
        type: SchemaTypes.ObjectId,
        ref: 'Comment',
        required: false, // if this is null, then it is a post reaction, else it is a comment reaction
        default: null
    }
}, {
    timestamps: true
});

likeSchema.index({ user: 1 });
likeSchema.index({ post: 1 });
likeSchema.index({ comment: 1 });

export default mongoose.model<ILikeDocument>('Like', likeSchema);