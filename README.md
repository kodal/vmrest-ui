# vmrest-ui

React + TypeScript + Vite UI for VMware Fusion vmrest API.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Docker

This repo includes a multi-stage Dockerfile that builds the Vite app and serves it via Nginx.

### Build image

```bash
docker build -t vmrest-ui:latest .
```

### Run container

```bash
docker run --rm -p 8080:80 vmrest-ui:latest
```

Open `http://localhost:8080`.

### Environment and base URL

If your API base URL differs in production, configure it via your app's environment handling (e.g. Vite envs) before building.
