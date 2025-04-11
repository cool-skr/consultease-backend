import { Readable } from 'stream';
import dotenv from 'dotenv';
import { google } from 'googleapis';
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

const auth = await authenticate();

const drive = google.drive({ version: 'v3', auth });

dotenv.config();
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
  

export  const uploadMultiple = async (filesArray = [], email, fileType) => {
    const links = [];
    for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const link = await uploadFile(file.buffer, file.originalname, file.mimetype, email, fileType, i);
        links.push(link);
    }
    return links;
};