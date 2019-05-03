import * as tl from 'vsts-task-lib/task';
import * as TestApi from 'vso-node-api/TestApi'
import * as TestInterfaces from 'vso-node-api/interfaces/TestInterfaces';

export interface TestAttachmentInfo{
    projectName: string;
    runId: number;
    attachmentId: number;
    attachmentType: TestInterfaces.AttachmentType;
    fileName: string;
}

export async function collectTestArtifacts(testApi: TestApi.ITestApi, 
    projectName: string, 
    buildUri: string): Promise<TestAttachmentInfo[]>{
 
    const collector = new TestArtifactCollector(testApi, projectName, buildUri);
    return await collector.collectArtifacts();
 }

// We don't want to download all possible attachments, just the types the scanner will process
export function isSupportedAttachmentType (attachmentType: TestInterfaces.AttachmentType): boolean {
    return attachmentType == TestInterfaces.AttachmentType.CodeCoverage ||
        attachmentType == TestInterfaces.AttachmentType.TmiTestRunSummary;
}

class TestArtifactCollector{

    constructor(private testApi: TestApi.ITestApi, 
        private projectName: string, 
        private buildUri: string){
    }

    private attachmentInfos: TestAttachmentInfo[];

    public async collectArtifacts(): Promise<TestAttachmentInfo[]>{

        const testRunIds = await this.GetTestRunIds();

        this.attachmentInfos = [];

        if (testRunIds && testRunIds.length > 0){
            await Promise.all(
                testRunIds.map(async runId => {
                    tl.debug(`Checking for test attachments for test runs '${runId}'`);
                    const attachments = await this.testApi.getTestRunAttachments(this.projectName, runId);
                    if (attachments && attachments.length > 0){
                        attachments.forEach(attachment => this.ProcessAttachment(runId, attachment));
                    }
                })
            );
        }
        else
        {
            tl.debug(`No test runs found for the build`);
        }
        
        return this.attachmentInfos;
    }

    // Returns the unique list of test run ids linked to the specified build, or an
    // empty list if there are no linked test runs
    private async GetTestRunIds() :Promise<number[]>{

        tl.debug('Checking for associated test runs...');
        const runs : TestInterfaces.TestRun[] = await this.testApi.getTestRuns(this.projectName, this.buildUri);
        
        if (runs && runs.length > 0)
        {
            tl.debug(`Test runs founds: ${runs.length}`);
            return runs.map(run => run.id);
        }
        else
        {
            tl.debug('No test runs found.');
            return [];
        }
    }

    private ProcessAttachment(runId: number, attachment: TestInterfaces.TestAttachment){

        if (isSupportedAttachmentType(attachment.attachmentType))
        {
            this.attachmentInfos.push(
                {   
                    projectName: this.projectName,
                    runId: runId,
                    attachmentId: attachment.id,
                    attachmentType: attachment.attachmentType,
                    fileName: attachment.fileName
                });
        }
        else {
            tl.warning(`Attachment type is not supported and will not be downloaded: run id: ${runId}, attachment id: ${attachment.id}, type: ${attachment.attachmentType}`);
        }
    }
}

