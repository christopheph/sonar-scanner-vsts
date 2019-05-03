import * as tl from 'vsts-task-lib/task';
import * as fs from 'fs-extra';

export function downloadFile(contentStream: NodeJS.ReadableStream, targetItemPath: string): Promise<{}> {
        return new Promise(async (downloadResolve, downloadReject) => {
            downloadFileImpl(contentStream, targetItemPath, downloadResolve, downloadReject);
        });
    }

async function downloadFileImpl(contentStream: NodeJS.ReadableStream, targetItemPath: string, downloadResolve, downloadReject) {
    try{
        tl.debug(`Downloading file to ${targetItemPath}...`);
        const outputStream = fs.createWriteStream(targetItemPath);
        contentStream.on('end', () => {
            tl.debug(`Downloaded file to ${targetItemPath}`);
            downloadResolve();
        });
        outputStream.on('error', err => {
            tl.warning('Failed to download test artifact' + err);
            downloadReject(err);
        });
        contentStream.pipe(outputStream);
    }
    catch(err){
        downloadReject(err);
    }
}

