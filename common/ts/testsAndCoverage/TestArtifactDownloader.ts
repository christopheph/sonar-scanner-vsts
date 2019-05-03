import * as tl from 'vsts-task-lib/task';
import * as TestApi from 'vso-node-api/TestApi'
import * as TestInterfaces from 'vso-node-api/interfaces/TestInterfaces';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as FileUtils from './fileDownload';
import { TestAttachmentInfo } from './TestArtifactCollector';

// TODO: make more robust - needs a retry mechanims.
// * look to see if there is a library function that does the job
// * if not, look at the other tasks in the azure pipelines repo for inspiration - there
//   are other tasks that implement this functionality: https://github.com/Microsoft/azure-pipelines-tasks/

export interface TestArtifact {
    path: string;
    artefactType?: TestInterfaces.AttachmentType
}

export async function downloadTestArtifacts(testApi: TestApi.ITestApi, 
    projectName: string, 
    artifactInfos: TestAttachmentInfo[]
    ): Promise<TestArtifact[]>{
 
        const downloader = new TestArtifactDownloader(testApi, projectName);
        return await downloader.fetchTestArtifacts(artifactInfos);
 }

export class TestArtifactDownloader{

    constructor(private testApi: TestApi.ITestApi, 
        private downloadPath: string){
    }

    private downloadedArtifacts: TestArtifact[];

    public async fetchTestArtifacts(artifactInfos: TestAttachmentInfo[]): Promise<TestArtifact[]>{
        if (artifactInfos.length == 0){
            return [];
        }

        this.downloadedArtifacts = [];
        await Promise.all(
            artifactInfos.map(async artifactInfo => {
                const download = await this.DownloadTestAttachmentFile(this.testApi, artifactInfo);
                this.downloadedArtifacts.push(download);
            })
        );
        
        return this.downloadedArtifacts;
    }

    private async DownloadTestAttachmentFile(testApi: TestApi.ITestApi, artifactInfo: TestAttachmentInfo)
        : Promise<TestArtifact>
        {
            if (!artifactInfo.fileName)
            {
                console.log(`Attachment '${artifactInfo.attachmentId}' of type '${artifactInfo.attachmentType}' does not have a file name and will not be downloaded`);
                return null;
            }

            console.log( `Downloading attachment: ${artifactInfo.fileName}, type: ${artifactInfo.attachmentType}`)
            const runFolder = path.join(this.downloadPath, artifactInfo.runId.toString());

            await fs.ensureDir(runFolder);

            const outputFilePath = path.join(runFolder, `${artifactInfo.fileName}`);

            if (fs.existsSync(outputFilePath)){
                tl.debug(`File has already been downloaded: '${outputFilePath}'`);
                return null;
            }

            const contentStream :NodeJS.ReadableStream = await testApi.getTestRunAttachmentContent(
                artifactInfo.projectName, artifactInfo.runId, artifactInfo.attachmentId);

            try{
                await FileUtils.downloadFile(contentStream, outputFilePath);
            }
            catch(err){
                tl.warning('Failed to download test artifact' + err);
            }

            return { path: outputFilePath, artefactType: artifactInfo.attachmentType };
    }
}