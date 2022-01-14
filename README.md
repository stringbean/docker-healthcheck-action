# Docker Container Health Check

GitHub Action for checking the status of a Docker container.

## Usage

### Get the status of a container

To query the status of a container, pass the container name (or id) to the action:

```yaml
jobs:
  test:
    steps:
      - name: Get container status
        uses: stringbean/docker-healthcheck-action
        id: missing-container
        with:
          container: unknown
      - run: echo "Container is ${{ steps.missing-container.outputs.status  }}"
```

This will output "Container is not-running".

### Waiting for a container to become healthy

To wait for a container to become healthy, pass in the required status &
`require-healthy: true`:

```yaml
jobs:
  test:
    steps:
      - name: Start container
        run: docker run -d --rm --name hello-world crccheck/hello-world
      - name: Wait for container
        uses: stringbean/docker-healthcheck-action
        with:
          container: hello-world
          wait-time: 50
          require-status: running
          require-healthy: true
```

This will start the `hello-world` container and wait for it to pass a health
check. If the container takes longer than 60 seconds to become healthy it will
fail the build.

## Configuration

### Inputs

| Name              | Description                                                                          | Default           |
| ----------------- | ------------------------------------------------------------------------------------ | ----------------- |
| `container`       | Name of the container to check                                                       | _none_ (required) |
| `require-status`  | Container status to expect/wait for.                                                 | _none_            |
| `require-healthy` | Require (or wait for) the container to be healthy.                                   | `false`           |
| `wait-time`       | Maximum number of time to wait for the container to reach the required state/health. | `0` (seconds)     |

### Outputs

| Name      | Description                       | Examples               |
| --------- | --------------------------------- | ---------------------- |
| `status`  | Current status of the container.  | `not-found`, `running` |
| `healthy` | Whether the container is healthy. | `true`, `false`        |
