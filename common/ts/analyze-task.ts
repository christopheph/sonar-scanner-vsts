import * as tl from 'vsts-task-lib/task';
import Scanner, { ScannerMode } from './sonarqube/Scanner';
import { checkForTestArtifacts } from './testsAndCoverage/TestAndCoverageHandling'

export default async function analyzeTask(rootPath: string) {
  const scannerMode: ScannerMode = ScannerMode[tl.getVariable('SONARQUBE_SCANNER_MODE')];
  tl.debug(`Scanner mode: ${scannerMode}`);
  if (!scannerMode) {
    throw new Error(
      "[SQ] The 'Prepare Analysis Configuration' task was not executed prior to this task"
    );
  }

  // See bug: VSTS-179 Coverage and unit tests are no longer automatically imported
  // https://jira.sonarsource.com/browse/VSTS-179
  // The VSTest@2 task might have deleted the test results and coverage files,
  // so we need to try to download them again from the server.
  if (scannerMode == ScannerMode.MSBuild){
    await checkForTestArtifacts();
  }
  else{
    tl.debug('Skipping check for test artifacts.');
  }

  const scanner = Scanner.getAnalyzeScanner(rootPath, scannerMode);
  await scanner.runAnalysis();
} 
