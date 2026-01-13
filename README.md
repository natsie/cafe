# Café ☕

> A simple cafe that serves you nibbles.

**Café** is a lightweight, robust static file server built on top of [Hono](https://hono.dev/). It is designed to be simple to use while providing advanced features like range requests, multipart serving, and a configurable "menu" system for access control.

Whether you need to quickly serve a directory for development or require a programmatic file server for your Node.js/Bun application, Café has you covered.

## Features

- **📂 Static File Serving:** Serve files from any directory with ease.
- **⚡ Range Requests:** Full support for HTTP Range headers, enabling partial content loading and media streaming.
- **🛡️ Menu System:** Control exactly what is served using glob patterns or regular expressions for inclusion and exclusion.
- **🔄 Resilient Startup:** Automatically detects busy ports and can retry or increment the port number.
- **🛠️ CLI & API:** Use it directly from the command line or integrate it into your own TypeScript/JavaScript application.

## Installation

Currently, Café is in alpha. You can run it directly from the source or install dependencies to build it.

### Prerequisites

- Node.js v25 or later.

### Clone and Run

```bash
# Clone the repository
git clone https://github.com/natsie/cafe.git
cd cafe

# Install dependencies
npm install

# Run the server
node src/bin.ts
```

## Usage

### Command Line Interface (CLI)

You can start Café directly from the command line. By default, it serves the current working directory on port `3333`.

```bash
# Start with defaults
node src/bin.ts

# Specify a different port
node src/bin.ts --port 8080

# Serve a specific directory
node src/bin.ts --basePath ./public

# Only serve .png files
node src/bin.ts --include "**/*.png"

# Exclude node_modules
node src/bin.ts --exclude "**/node_modules/**"
```

#### CLI Options

| Option                   | Description                                                                         | Default         |
| :----------------------- | :---------------------------------------------------------------------------------- | :-------------- |
| `--port`                 | The port to listen on.                                                              | `3333`          |
| `--basePath`             | The root directory to serve files from.                                             | `process.cwd()` |
| `--include`              | Glob pattern or RegExp (`regexp:...`) to include files. Can be used multiple times. | `["**/*"]`      |
| `--exclude`              | Glob pattern or RegExp to exclude files.                                            | `[]`            |
| `--alias`                | Map specific paths to other locations. Format: `key=value` (comma-separated).       | `{}`            |
| `--broadcastVersion`     | Adds a `Cafe-Version` header to responses.                                          | `false`         |

### Programmatic API

Café can also be used as a library within your own application.

```typescript
import { Cafe } from "./src/cafe";
import { resolve } from "path";

// Create a new Cafe instance
const cafe = new Cafe({
  port: 3000,
  basePath: resolve("./static"),
  menu: {
    include: ["**/*.html", "**/*.css", "**/*.js"],
    exclude: ["**/secret/**"],
  },
});

// Start listening
cafe
  .listen(3000, {
    incremental: true, // If 3000 is taken, try 3001, etc.
    retryCount: 5,
  })
  .then((instance) => {
    console.log(`Cafe is serving at http://localhost:${instance.port}`);
  })
  .catch((err) => {
    console.error("Failed to open the cafe:", err);
  });

// Listen for events
cafe.on("listening", (instance) => {
  console.log("Cafe is open!");
});
```

## API Documentation

### `class Cafe`

The main class for creating a server instance.

#### `constructor(config?: ICafe.PartialConfig)`

Creates a new `Cafe` instance.

- **config**: Configuration object (optional).
  - `port`: Default port (default: 3333).
  - `basePath`: Root directory to serve.
  - `menu`: Object with `include` and `exclude` arrays (strings or RegExps).
  - `alias`: Object mapping path prefixes to other locations.
  - `exposeAPI`: (Experimental) Expose internal API.
  - `broadcastVersion`: Send version header.

#### `listen(port?: number, options?: ICafe.ListenOptions): Promise<Cafe>`

Starts the server.

- **port**: Port to listen on.
- **options**:
  - `incremental`: If true, increments port number if the specified one is busy.
  - `retryCount`: Number of retries before failing (-1 for infinite).
  - `retryInterval`: Time in ms between retries.

#### `close(): Promise<Cafe>`

Closes the server and frees up the port.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
