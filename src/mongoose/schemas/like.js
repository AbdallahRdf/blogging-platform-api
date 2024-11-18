import mongoose, { Schema, SchemaTypes } from "mongoose";

const likeSchema = new Schema({
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
    },
    isLiked: {
        type: SchemaTypes.Boolean,
        required: true,
        default: false
    },
    isDisliked: {
        type: SchemaTypes.Boolean,
        required: true,
        default: false
    }
}, {
    timestamps: true
});

likeSchema.index({ user: 1 });
likeSchema.index({ post: 1 });
likeSchema.index({ comment: 1 });

export default mongoose.model('Like', likeSchema);