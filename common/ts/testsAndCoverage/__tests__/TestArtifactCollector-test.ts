import { AttachmentType } from 'vso-node-api/interfaces/TestInterfaces';
import * as tapi from 'vso-node-api/TestApi';
import * as collect from '../TestArtifactCollector';

// Mock TestApi
jest.mock('vso-node-api/TestApi');
beforeEach(() => {
    jest.restoreAllMocks();
  });

it('only code coverage and run summaries should be supported', async () => {
    expect(collect.isSupportedAttachmentType(AttachmentType.CodeCoverage)).toBe(true);
    expect(collect.isSupportedAttachmentType(AttachmentType.TmiTestRunSummary)).toBe(true);
        
    for (let index = 0; index < 20; index++) {
        if (index == AttachmentType.CodeCoverage || index == AttachmentType.TmiTestRunSummary)
        {
            continue;
        }
        expect(collect.isSupportedAttachmentType(index)).toBe(false);
    }
});

it('no test runs -> empty array returned', async () => {
    //
    debugger;
    const testApi = new tapi.TestApi(null, null);

    const result = await collect.collectTestArtifacts(testApi, 'project1', 'my Build Uri');

    expect(result).not.toBeUndefined();
    expect(result.length).toBe(0);
    expect(testApi.getTestRuns).toHaveBeenCalledWith('project1', 'my Build Uri');
});


it('multiple test runs with no artifacts', async () => {

    debugger;
    const run1: any = { id: 101 };
    const run2: any = { id: 202 };

    const testApi = new tapi.TestApi(null, null);
    jest.spyOn(testApi, 'getTestRuns').mockImplementation(() => [ run1, run2 ]);
    jest.spyOn(testApi, 'getTestRunAttachments')
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce([]);

    const result = await collect.collectTestArtifacts(testApi, 'project1', 'my Build Uri');

    expect(testApi.getTestRuns).toHaveBeenCalled();
    expect(testApi.getTestRunAttachments).toHaveBeenCalledTimes(2);
    expect(testApi.getTestRunAttachments).toHaveBeenCalledWith('project1', 101);
    expect(testApi.getTestRunAttachments).toHaveBeenCalledWith('project1', 202);
    expect(result).toBeTruthy();
});
    

it.only('only supported artifacts returned', async () => {

    debugger;
    // Set up two dummy test runs, both with attachments
    const run1: any = { id: 101 };
    const run2: any = { id: 202 };

    const attach1a: any = { id: 1001, attachmentType: AttachmentType.AfnStrip };
    const attach1b: any = { id: 1002, attachmentType: AttachmentType.BugFilingData };
    const attach1c: any = { id: 1003, attachmentType: AttachmentType.CodeCoverage }; // should be returned
    const attach1d: any = { id: 1004, attachmentType: AttachmentType.CodeCoverage }; // should be returned
    const attach1e: any = { id: 1005, attachmentType: AttachmentType.TmiTestRunSummary }; // should be returned

    const attach2a: any = { id: 2001, attachmentType: AttachmentType.CodeCoverage }; // should be returned
    const attach2b: any = { id: 2002, attachmentType: AttachmentType.ConsoleLog };
    const attach2c: any = { id: 2003, attachmentType: AttachmentType.TmiTestResultDetail };
    const attach2d: any = { id: 2004, attachmentType: AttachmentType.TmiTestRunSummary }; // should be returned
    const attach2e: any = { id: 2005, attachmentType: AttachmentType.TmiTestRunSummary }; // should be returned

    const testApi = new tapi.TestApi(null, null);
    jest.spyOn(testApi, 'getTestRuns').mockImplementation(() => [ run1, run2 ]);
    jest.spyOn(testApi, 'getTestRunAttachments')
        .mockReturnValueOnce([ attach1a, attach1b, attach1c, attach1d, attach1e ])
        .mockReturnValueOnce([ attach2a, attach2b, attach2c, attach2d, attach2e ]);

    const result = await collect.collectTestArtifacts(testApi, 'project1', 'my Build Uri');

    expect(testApi.getTestRuns).toHaveBeenCalled();
    expect(testApi.getTestRunAttachments).toHaveBeenCalledTimes(2);

    expect(result).toHaveLength(6);

    const actualIds = result.map(a => a.attachmentId);
    expect(actualIds).toEqual(expect.arrayContaining([1003, 1004, 1005, 2001, 2004, 2005]));

    // Detailed check of one of the returned artifacts:
    expect(result[0].attachmentId).toBe(1003);
    expect(result[0].attachmentType).toBe(AttachmentType.CodeCoverage);
    expect(result[0].fileName).toBeUndefined();
    expect(result[0].projectName).toBe('project1');
    expect(result[0].runId).toBe(101);
});
    