import express from "express";
import mongoose from "mongoose";
import routes from "./src/routes/routes.js";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

const connectWithRetry = () => {
    mongoose.connect(process.env.MONGODB_CONNECTION_STRING)
        .then(() => console.log("connected to the database"))
        .catch(error => {
            console.log('MongoDB connection unsuccessful, retry after 5 seconds. ', error);
            setTimeout(connectWithRetry, 5000);
        });
};

connectWithRetry();

const port = process.env.PORT || 5000;

const app = express();

app.use(cookieParser());

app.use(helmet());

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true, // Allows sending cookies in requests
    methods: 'GET, POST, PUT, PATCH, DELETE',

}));

app.use(express.json());

app.use(morgan('dev'));

app.use('/api', routes);

app.use('*', (req, res) => res.status(404).json({ message: 'Not found' }));

app.listen(port, () => console.log(`server running on port ${port}`));