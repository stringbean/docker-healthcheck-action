import * as core from '@actions/core';
import Dockerode, { Container } from 'dockerode';

const SLEEP_TIME = 100;

interface Status {
  status: String;
  healthy?: boolean;
}

async function fetchStatus(container: Container): Promise<Status> {
  try {
    const info = await container.inspect();

    const result: Status = {
      status: info.State?.Status || 'unknown',
    };

    if (info.State.Health?.Status) {
      result.healthy = info.State.Health?.Status === 'healthy';
    }

    return result;
  } catch (error: any) {
    if (error.statusCode === 404) {
      return { status: 'not-found' };
    } else {
      throw error;
    }
  }
}

async function delay<T>(duration: number, f: () => T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(f()), duration);
  });
}

async function waitForStatus(
  container: Dockerode.Container,
  requireStatus: string,
  requireHealthy: boolean,
  remainingWaitMs: number,
): Promise<void> {
  const status = await fetchStatus(container);

  if (status.status === requireStatus && (!requireHealthy || status.healthy)) {
    // success
    outputStatus(status);
  } else if (remainingWaitMs <= 0) {
    // run out of time
    outputStatus(status);

    if (status.status !== requireStatus) {
      core.setFailed(
        `container had status '${status.status}' - required '${requireStatus}'`,
      );
    } else {
      core.setFailed(
        `container has status '${status.status}' but is not healthy`,
      );
    }
  } else {
    return await delay(SLEEP_TIME, () =>
      waitForStatus(
        container,
        requireStatus,
        requireHealthy,
        remainingWaitMs - SLEEP_TIME,
      ),
    );
  }
}

function outputStatus(status: Status) {
  core.setOutput('status', status.status);

  if (status.healthy !== undefined) {
    core.setOutput('healthy', status.healthy);
  }
}

async function run() {
  const containerName = core.getInput('container');
  const requiredStatus = core.getInput('require-status');
  const requireHealthy = core.getBooleanInput('require-healthy');
  const waitDuration = parseInt(core.getInput('wait-time'));

  core.debug(
    `Checking status of ${containerName}, require-status: ${requiredStatus}, require-healthy: ${requireHealthy}, wait-duration: ${waitDuration}s`,
  );

  const docker = new Dockerode();
  const container = docker.getContainer(containerName);

  if (requiredStatus) {
    await waitForStatus(
      container,
      requiredStatus,
      requireHealthy,
      waitDuration * 1000,
    );
  } else {
    const status = await fetchStatus(container);
    outputStatus(status);
  }
}

run().catch((error) => {
  core.error('Unexpected error while checking Docker');
  core.debug(error);
  core.setFailed(error);
});
