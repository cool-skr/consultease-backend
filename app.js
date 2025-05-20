import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import connectDB from './DB/Connection.js';
import router from './API/routes/User.js';
import adminRouter from './API/routes/Admin.js';
import projectRouter from './API/routes/Project.js';
const app = express();

// Connect to DB only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

app.use(cors()); 
app.use(express.urlencoded({ extended: false }))
app.use(express.json());
app.use(morgan('dev'));
app.use('/user',router);
app.use('/project',projectRouter);
app.use('/admin',adminRouter);
export default app;
