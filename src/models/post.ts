import mongoose, { Schema, SchemaTypes } from "mongoose";
import { PostBlockType } from "../enums/post.enums";

export interface IPostHeader {
    id: string;
    type: string;
    value: string
}

export interface IPostContent {
    type: PostBlockType;
    value: string;
    language?: string
}

export type PostHeaders = Array<IPostHeader>;

export type PostContents = Array<IPostContent>;

export interface IPost {
    title: string;
    slug: string;
    description: string;
    headers: PostHeaders;
    cover: string;
    content: PostContents;
    author: mongoose.Types.ObjectId;
    tags: string[];
    likes: number;
    comments: number;
}

const contentBlockSchema = new Schema({
    type: {
        type: SchemaTypes.String,
        enum: Object.values(PostBlockType),
        required: true
    },
    value: {
        type: SchemaTypes.String,
        required: true
    },
    language: {
        type: SchemaTypes.String,
        required: false
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

const postSchema = new Schema<IPost>({
    title: {
        type: SchemaTypes.String,
        required: true,
        unique: true
    },
    slug: {
        type: SchemaTypes.String,
        required: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: SchemaTypes.String,
        required: true
    },
    headers: [HeaderSchema], // array of headers, used for table of contents
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
    comments: {
        type: SchemaTypes.Number,
        default: 0
    }
},
    {
        timestamps: true
    })

postSchema.index({ tags: 1 });
postSchema.index({ slug: 1 }, { unique: true });

export default mongoose.model<IPost>('Post', postSchema);