import mongoose, { Schema, SchemaTypes } from "mongoose";

export interface IComment {
    postId: mongoose.Types.ObjectId;
    author: mongoose.Types.ObjectId;
    body: string;
    likes: number;
    replies: number;
}

const commentSchema = new Schema<IComment>({
    postId: {
        type: SchemaTypes.ObjectId,
        ref: 'Post',
        required: true
    },
    author: {
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
    replies: {
        type: SchemaTypes.Number,
        default: 0
    }
},
    {
        timestamps: true
    });

commentSchema.index({ postId: 1 });
commentSchema.index({ author: 1 });

export default mongoose.model<IComment>('Comment', commentSchema);