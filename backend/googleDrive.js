const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];
const ROOT_FOLDER_ID = '16AO9HOzBTiwmKz_IEGoDQYaDoXwczy9x';

async function getDriveClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, 'google-credentials.json'),
        scopes: SCOPES,
    });
    return google.drive({ version: 'v3', auth });
}

async function getOrCreateFolder(drive, folderName, parentId) {
    const res = await drive.files.list({
        q: `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
    });

    if (res.data.files.length > 0) {
        return res.data.files[0].id;
    }

    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
    };

    const folder = await drive.files.create({
        resource: fileMetadata,
        fields: 'id',
    });

    return folder.data.id;
}

async function uploadFileToDrive({ filePath, fileName, folders }) {
    const drive = await getDriveClient();

    let currentParentId = ROOT_FOLDER_ID;

    // Create folder structure: Tipo -> Empleado -> Fecha
    for (const folderName of folders) {
        currentParentId = await getOrCreateFolder(drive, folderName, currentParentId);
    }

    const fileMetadata = {
        name: fileName,
        parents: [currentParentId],
    };

    const media = {
        mimeType: 'application/pdf',
        body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
    });

    return file.data;
}

module.exports = { uploadFileToDrive };
