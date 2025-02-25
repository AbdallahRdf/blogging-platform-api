import mongoose, { Schema, SchemaTypes } from "mongoose";

const commentSchema = new Schema({
    postId: {
        type: SchemaTypes.ObjectId,
        ref: 'Post',
        required: true
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

commentSchema.index({ postId: 1 });
commentSchema.index({ owner: 1 });

export default mongoose.model('Comment', commentSchema);