import mongoose, { Schema, SchemaTypes } from "mongoose";

const replySchema = new Schema({
    postId: {
        type: SchemaTypes.ObjectId,
        ref: 'Post',
        required: true
    },
    parentCommentId: {
        type: SchemaTypes.ObjectId,
        ref: 'Comment',
        required: true
    },
    replyId: {
        type: SchemaTypes.ObjectId,
        ref: 'Reply',
        required: true 
    },
    replyUsername: {  // Stores the username of the comment being replied to
        type: SchemaTypes.String,
        default: null ,
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
    }
},
    {
        timestamps: true
    });

replySchema.index({ postId: 1 });
replySchema.index({ parentCommentId: 1 });
replySchema.index({ replyId: 1 });
replySchema.index({ owner: 1 });

export default mongoose.model('Reply', replySchema);