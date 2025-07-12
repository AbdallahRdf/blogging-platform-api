import mongoose, { ObjectId, Schema, SchemaTypes } from "mongoose";

export interface IReply {
    postId: ObjectId;
    commentId: ObjectId;
    replyToUsername: string;
    author: ObjectId;
    body: string;
    likes: number
}

const replySchema = new Schema<IReply>({
    postId: {
        type: SchemaTypes.ObjectId,
        ref: 'Post',
        required: true
    },
    commentId: {
        type: SchemaTypes.ObjectId,
        ref: 'Comment',
        required: true
    },
    replyToUsername: {  // Stores the username of the comment being replied to
        type: SchemaTypes.String,
        default: null ,
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
    }
},
    {
        timestamps: true
    });

replySchema.index({ postId: 1 });
replySchema.index({ commentId: 1 });
replySchema.index({ replyId: 1 });
replySchema.index({ author: 1 });

export default mongoose.model<IReply>('Reply', replySchema);