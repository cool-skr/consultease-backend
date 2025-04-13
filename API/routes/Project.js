import express from 'express';
import mongoose from 'mongoose';
import {google} from 'googleapis';
import dotenv from 'dotenv';
import multer from 'multer';
import { mapRowToProject } from '../../utils/projectMapper.js';
import { uploadMultiple,deleteProjectFiles } from '../../utils/fileUploadUtils.js';
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

    const sheets = google.sheets({ version: 'v4', auth });

    const SPREADSHEET_ID = process.env.SHEET_ID;

    const projectId = new mongoose.Types.ObjectId().toString();

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
    const completed = "no";

    const billSettlementLinks = await uploadMultiple(req.files['billSettlement'], projectId+email, 'billSettlement');
    const agreementLinks = await uploadMultiple(req.files['agreement'], projectId+email, 'agreement');

    const formattedDuration = Array.isArray(projectDuration)
      ? projectDuration.join(' to ')
      : projectDuration;

    const row = [
      projectId, 
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
      agreementLinks.join(', '),
      completed
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

    res.status(200).json({ 
      message: 'Project submitted successfully!',
      projectId: projectId 
    });
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

        const userProjects = rows.slice(1)
            .filter(row => row[1] === userEmail)
            .map(row => mapRowToProject(row));

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

        const allProjects = rows.slice(1).map(row => mapRowToProject(row));

        res.status(200).json(allProjects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Error fetching projects' });
    }
});

projectRouter.get('/fetch/project/:projectId', async (req, res) => {
    try {
        const auth = await authenticate();
        const sheets = google.sheets({ version: 'v4', auth });
        const projectId = req.params.projectId;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Sheet1'
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        const project = rows.slice(1).find(row => row[0] === projectId);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const projectData = mapRowToProject(project);

        res.status(200).json(projectData);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ message: 'Error fetching project' });
    }
});

projectRouter.delete('/delete/:projectId', async (req, res) => {
    try {
        const auth = await authenticate();
        const sheets = google.sheets({ version: 'v4', auth });
        const projectId = req.params.projectId;

        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: process.env.SHEET_ID,
            fields: 'sheets.properties'
        });
        
        if (!spreadsheet.data.sheets || spreadsheet.data.sheets.length === 0) {
            return res.status(404).json({ message: 'Sheet not found' });
        }

        const sheetId = spreadsheet.data.sheets[0].properties.sheetId;
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Sheet1!A:A'
        });

        const rows = response.data.values || [];
        
        const rowIndex = rows.findIndex(row => row[0] === projectId);
        if (rowIndex === -1) {
            return res.status(404).json({ message: 'Project not found' });
        }
        
        const deleteSuccess = await deleteProjectFiles(projectId);
        if (!deleteSuccess) {
            console.log(`Failed to delete Drive folder for project ${projectId}`);
        }
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: process.env.SHEET_ID,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex, 
                            endIndex: rowIndex + 1
                        }
                    }
                }]
            }
        });

        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete error:', {
            message: error.message,
            response: error.response?.data
        });
        res.status(500).json({ 
            message: 'Failed to delete project',
            error: error.message 
        });
    }
});

projectRouter.put('/update/:projectId', upload.fields([
    { name: 'billSettlement' },
    { name: 'agreement' }
]), async (req, res) => {
    try {
        const auth = await authenticate();
        const sheets = google.sheets({ version: 'v4', auth });
        const { projectId } = req.params;
        
        const [spreadsheet, valuesResponse] = await Promise.all([
            sheets.spreadsheets.get({
                spreadsheetId: process.env.SHEET_ID,
                fields: 'sheets.properties'
            }),
            sheets.spreadsheets.values.get({
                spreadsheetId: process.env.SHEET_ID,
                range: 'Sheet1'
            })
        ]);

        const rows = valuesResponse.data.values || [];
        const rowIndex = rows.findIndex(row => row[0] === projectId);
        
        if (rowIndex === -1) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const sheetId = spreadsheet.data.sheets[0].properties.sheetId;
        const currentRow = rows[rowIndex];

        let billSettlementLinks = (currentRow[12] || '').split(', ');
        if (req.files['billSettlement']) {
            billSettlementLinks = await uploadMultiple(req.files['billSettlement'], projectId+(req.body.email || currentRow[1]), 'billSettlement',true);
        }

        let agreementLinks = (currentRow[13] || '').split(', ');
        if (req.files['agreement']) {
            agreementLinks = await uploadMultiple(req.files['agreement'], projectId+(req.body.email || currentRow[1]), 'agreement',true);
        }

        const updatedRow = [
            projectId,
            req.body.email || currentRow[1],
            req.body.industryName || currentRow[2],
            req.body.projectDuration ? 
                (Array.isArray(req.body.projectDuration) ? 
                    req.body.projectDuration.join(' to ') : 
                    req.body.projectDuration) : 
                currentRow[3],
            req.body.projectTitle || currentRow[4],
            req.body.principalInvestigator || currentRow[5],
            req.body.coPrincipalInvestigator || currentRow[6],
            req.body.academicYear || currentRow[7],
            req.body.amountSanctioned || currentRow[8],
            req.body.amountReceived || currentRow[9],
            req.body.studentDetails || currentRow[10],
            req.body.projectSummary || currentRow[11],
            billSettlementLinks.join(', '),
            agreementLinks.join(', '),
            req.body.completed || currentRow[14]
        ];

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: process.env.SHEET_ID,
            requestBody: {
                requests: [{
                    updateCells: {
                        range: {
                            sheetId,
                            startRowIndex: rowIndex,
                            endRowIndex: rowIndex + 1,
                            startColumnIndex: 0,
                            endColumnIndex: updatedRow.length
                        },
                        rows: [{ values: updatedRow.map(value => ({ userEnteredValue: { stringValue: value } })) }],
                        fields: 'userEnteredValue'
                    }
                }]
            }
        });

        res.status(200).json({ 
            message: 'Project updated successfully',
            projectId
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ 
            message: 'Error updating project',
            error: error.message 
        });
    }
});

export default projectRouter;