import * as tl from 'vsts-task-lib/task';
import * as azdev from 'vso-node-api';
import * as TestApi from 'vso-node-api/TestApi'
import * as path from 'path';
import * as collect from './TestArtifactCollector'
import * as download from './TestArtifactDownloader'
import { IRequestHandler } from 'vso-node-api/interfaces/common/VsoBaseInterfaces';

export async function checkForTestArtifacts(){
    console.log('Checking for test artifacts for the build...');

    // Create a connection object we can use to call the Azure DevOps REST APIs
    var endpointUrl: string = tl.getVariable("System.TeamFoundationCollectionUri");
    var accessToken: string = tl.getEndpointAuthorizationParameter('SYSTEMVSSCONNECTION', 'AccessToken', false);
    var credentialHandler: IRequestHandler = azdev.getHandlerFromToken(accessToken);
    var connection: azdev.WebApi = new azdev.WebApi(endpointUrl, credentialHandler);

    const buildUri: string = tl.getVariable("Build.BuildUri");
    const projectName = tl.getVariable('System.TeamProject');
    // Location to which we'll download the test report and coverage files, if any.
    // The agent temporary directory is cleaned after each build so we don't need to
    // worry about the files being picked up by later builds.
    const downloadPath: string = path.join(tl.getVariable('Agent.TempDirectory'), '.sonar');

    const testApi: TestApi.ITestApi = await connection.getTestApi();

    const artifactInfos = await collect.collectTestArtifacts(testApi, projectName, buildUri);

    if (artifactInfos && artifactInfos.length > 0){
        await download.downloadTestArtifacts(testApi, downloadPath, artifactInfos);
    }
    else{
        console.log(`Build ${buildUri} does not have any applicable test artifacts`);
    }

    // TODO: how to pass the data to the Scanner for MSBuild?
    // TODO - what do we do if the user has explicitly specified either
    // of the properties?
}



