import { Readable } from 'stream';
import dotenv from 'dotenv';
import { google } from 'googleapis';
dotenv.config();
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

export async function getOrCreateFolder(email) {
    try {
        const res = await drive.files.list({
            q: `name='${email}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)'
        });
        
        if (res.data.files.length > 0) {
            return res.data.files[0].id; 
        }

        const folder = await drive.files.create({
            requestBody: {
                name: email,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [process.env.DRIVE_FOLDER_ID]
            },
            fields: 'id'
        });
        
        return folder.data.id;
    } catch (error) {
        console.error('Error creating folder:', error);
        throw error;
    }
}

const uploadFile = async (fileBuffer, fileName, mimeType, email, fileType, index) => {
    const newFileName = `${email}_${fileType}${index + 1}${fileName.substring(fileName.lastIndexOf('.'))}`;
    const folderId = await getOrCreateFolder(email);
    
    const res = await drive.files.create({
        requestBody: {
            name: newFileName,
            mimeType: mimeType,
            parents: [folderId] 
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
  
async function deleteOldFiles(folderId, fileType) {
    try {
        const res = await drive.files.list({
            q: `name contains '${fileType}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id)'
        });
        
        await Promise.all(
            res.data.files.map(file => 
                drive.files.delete({ fileId: file.id })
            )
        );
        return true;
    } catch (error) {
        console.error('Error deleting old files:', error);
        return false;
    }
}

export const uploadMultiple = async (filesArray = [], email, fileType, shouldDeleteOld = false) => {
    const links = [];
    const folderId = await getOrCreateFolder(email);

    if (shouldDeleteOld) {
        await deleteOldFiles(folderId, fileType);
    }

    for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        const link = await uploadFile(file.buffer, file.originalname, file.mimetype, email, fileType, i);
        links.push(link);
    }
    return links;
};

export async function deleteProjectFiles(folderName) {
    try {
        const res = await drive.files.list({
            q: `name contains '${folderName}' and mimeType='application/vnd.google-apps.folder' and '${process.env.DRIVE_FOLDER_ID}' in parents and trashed=false`,
            fields: 'files(id)'
        });

        if (res.data.files.length === 0) {
            console.log(`No folders containing '${folderName}' found.`);
            return false; 
        }

        await Promise.all(
            res.data.files.map(folder => 
                drive.files.delete({ fileId: folder.id })
            )
        );
        return true;
    } catch (error) {
        console.error('Error deleting project folders:', error);
        return false;
    }
}