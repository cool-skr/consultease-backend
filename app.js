import express from 'express';
import morgan from 'morgan';
import connectDB from './DB/Connection.js';
import router from './API/routes/User.js';

const app = express();
connectDB();
app.use(express.urlencoded({ extended: false }))
app.use(express.json());
app.use(morgan('dev'));
app.use('/user',router);

export default app;
