import mongoose, { Schema, SchemaTypes } from "mongoose";

const commentSchema = new Schema({
    post: {
        type: SchemaTypes.ObjectId,
        ref: 'Post',
        required: true
    },
    replyTo: {
        type: SchemaTypes.ObjectId,
        ref: 'Comment',
        default: null // If this is null, it's a top-level comment
    },
    parentUsername: {  // Stores the username of the parent comment owner
        type: SchemaTypes.String,
        default: null  // Only relevant for replies
    },
    owner: {
        type: SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    },
    body: {
        type: SchemaTypes.String,
        required: true
    },
    likes: {
        type: SchemaTypes.Number,
        default: 0
    },
    dislikes: {
        type: SchemaTypes.Number,
        default: 0
    },
    replies: {
        type: SchemaTypes.Number,
        default: 0
    }
},
{
    timestamps: true
});

commentSchema.index({ post: 1 });
commentSchema.index({ replyTo: 1 });
commentSchema.index({ owner: 1 });

export default mongoose.model('Comment', commentSchema);