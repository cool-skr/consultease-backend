import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../../DB/models/User.js';
import { checkAuth } from '../middleware/auth.js';
import {google} from 'googleapis';
import dotenv from 'dotenv';
import multer from 'multer';
import { Readable } from 'stream';

dotenv.config();
const projectRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const SERVICE_ACCOUNT_FILE =process.env.KEY_URL;
const SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets"
  ];
  
async function authenticate() {
    const auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_FILE,
        scopes: SCOPES,
    });
    return auth;
}


projectRouter.post('/submit', upload.fields([
  { name: 'billSettlement' },
  { name: 'agreement' }
]), async (req, res) => {
  try {
    const auth = await authenticate();

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    const SPREADSHEET_ID = process.env.SHEET_ID;

    const {
      email,
      industryName,
      projectDuration,
      projectTitle,
      principalInvestigator,
      coPrincipalInvestigator,
      academicYear,
      amountSanctioned,
      amountReceived,
      studentDetails,
      projectSummary
    } = req.body;

    const uploadFile = async (fileBuffer, fileName, mimeType, email, fileType, index) => {
        const newFileName = `${email}_${fileType}${index + 1}${fileName.substring(fileName.lastIndexOf('.'))}`;
        
        const res = await drive.files.create({
            requestBody: {
                name: newFileName,
                mimeType: mimeType,
                parents: [process.env.DRIVE_FOLDER_ID]
            },
            media: {
                mimeType: mimeType,
                body: Readable.from(fileBuffer)
            }
        });

        const fileId = res.data.id;

        await drive.permissions.create({
            fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        return `https://drive.google.com/uc?id=${fileId}`;
    };
      

    const uploadMultiple = async (filesArray = [], email, fileType) => {
        const links = [];
        for (let i = 0; i < filesArray.length; i++) {
            const file = filesArray[i];
            const link = await uploadFile(file.buffer, file.originalname, file.mimetype, email, fileType, i);
            links.push(link);
        }
        return links;
    };

    // Update the calls to uploadMultiple with correct parameters
    const billSettlementLinks = await uploadMultiple(req.files['billSettlement'], email, 'billSettlement');
    const agreementLinks = await uploadMultiple(req.files['agreement'], email, 'agreement');

    const formattedDuration = Array.isArray(projectDuration)
      ? projectDuration.join(' to ')
      : projectDuration;

    const row = [
      email,
      industryName,
      formattedDuration,
      projectTitle,
      principalInvestigator,
      coPrincipalInvestigator,
      academicYear,
      amountSanctioned,
      amountReceived,
      studentDetails,
      projectSummary,
      billSettlementLinks.join(', '),
      agreementLinks.join(', ')
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row]
      }
    });

    res.status(200).send('Project submitted successfully!');
  } catch (error) {
    console.error('Error submitting project:', error);
    res.status(500).send('Error submitting project');
  }
});

projectRouter.get('/fetch/:email', async (req, res) => {
    try {
        const auth = await authenticate();
        const sheets = google.sheets({ version: 'v4', auth });
        const userEmail = req.params.email;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Sheet1'
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        const userProjects = rows.slice(1).filter(row => row[0] === userEmail).map(row => ({
            email: row[0],
            industryName: row[1],
            projectDuration: row[2],
            projectTitle: row[3],
            principalInvestigator: row[4],
            coPrincipalInvestigator: row[5],
            academicYear: row[6],
            amountSanctioned: row[7],
            amountReceived: row[8],
            studentDetails: row[9],
            projectSummary: row[10],
            billSettlement: row[11],
            agreement: row[12]
        }));

        if (userProjects.length === 0) {
            return res.status(404).json({ message: 'No projects found for this email' });
        }

        res.status(200).json(userProjects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Error fetching projects' });
    }
});

projectRouter.get('/admin/fetch', async (req, res) => {
    try {
        const auth = await authenticate();
        const sheets = google.sheets({ version: 'v4', auth });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Sheet1'
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        const allProjects = rows.slice(1).map(row => ({
            email: row[0],
            industryName: row[1],
            projectDuration: row[2],
            projectTitle: row[3],
            principalInvestigator: row[4],
            coPrincipalInvestigator: row[5],
            academicYear: row[6],
            amountSanctioned: row[7],
            amountReceived: row[8],
            studentDetails: row[9],
            projectSummary: row[10],
            billSettlement: row[11],
            agreement: row[12]
        }));

        res.status(200).json(allProjects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Error fetching projects' });
    }
});

export default projectRouter;