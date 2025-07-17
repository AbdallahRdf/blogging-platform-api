import express from "express";
import mongoose from "mongoose";
import routes from "./routes/routes.js";
import morgan from "morgan";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler } from "./utils/errorHandler.js";
import yaml from 'yamljs';
import swaggerUi from "swagger-ui-express";

const connectWithRetry = () => {
    mongoose.connect(process.env.MONGODB_CONNECTION_STRING as string)
        .then(() => console.log("Connected to the database"))
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
    origin: process.env.FRONTEND_URL as string,
    credentials: true, // Allows sending cookies in requests
    methods: 'GET, POST, PUT, PATCH, DELETE',
}));

app.use(express.json());

app.use(morgan('dev'));

const swaggerDocument = yaml.load(import.meta.dirname + '/doc/swagger.yaml');
if (process.env.NODE_ENV === 'development') {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));
}

app.use('/api', routes);

app.use('*', (_, res) => {
    res.status(404).json({ message: 'Not found' });
});

app.use(errorHandler);

app.listen(port, () => console.log(`server running on port ${port}`));