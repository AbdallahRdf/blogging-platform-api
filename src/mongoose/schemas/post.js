import mongoose, { Schema, SchemaTypes } from "mongoose";
import { POST_BODY_BLOCKS } from "../../utils/enums.js";

const contentBlockSchema = new Schema({
    type: {
        type: SchemaTypes.String,
        enum: [...Object.values(POST_BODY_BLOCKS)],
        required: true
    },
    value: {
        type: SchemaTypes.String,
        required: true
    },
    language: {
        type: SchemaTypes.String,
        required: function () { return this.type === POST_BODY_BLOCKS.CODE_SNIPPET; }
    }
},
    {
        _id: false // Prevents creating a separate _id for each content block
    }
);

const HeaderSchema = new Schema({
    id: {
        type: SchemaTypes.String,
        required: true
    },
    type: {
        type: SchemaTypes.String,
        required: true
    },
    value: {
        type: SchemaTypes.String,
        required: true
    }
},
    {
        _id: false
    }
);

const postSchema = new Schema({
    title: {
        type: SchemaTypes.String,
        required: true,
        unique: true
    },
    description: {
        type: SchemaTypes.String,
        required: true
    },
    headers: [HeaderSchema], // array of headers
    cover: {
        type: SchemaTypes.String,
        required: true
    },
    content: [contentBlockSchema], // array of content blocks
    author: {
        type: SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    },
    tags: [
        {
            type: SchemaTypes.String
        }
    ],
    likes: {
        type: SchemaTypes.Number,
        default: 0
    },
    dislikes: {
        type: SchemaTypes.Number,
        default: 0
    },
    comments: {
        type: SchemaTypes.Number,
        default: 0
    }
},
    {
        timestamps: true
    })

postSchema.index({ tags: 1 });

export default mongoose.model('Post', postSchema);