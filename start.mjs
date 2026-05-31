import { execSync, spawn } from 'child_process';
import net from 'net';
import fs from 'fs';
import path from 'path';

// Helper to find a free port starting from a given port
async function findFreePort(startPort) {
  let port = startPort;
  while (true) {
    if (await isPortFree(port)) {
      return port;
    }
    port++;
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

async function main() {
  // backend/.env is created automatically when the backend boots:
  // backend/src/env.js scaffolds it from .env.example and the secrets bootstrap
  // fills in AUTH_SECRET / ENCRYPTION_KEY — so no manual copy is needed here.

  console.log('Checking dependencies...');
  
  // Only run setup if node_modules is missing
  if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    try {
      console.log('Running initial setup (npm install & engine install)...');
      execSync('npm run setup', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to run setup:', error);
      process.exit(1);
    }
  } else {
    console.log('Setup has already been run (node_modules exists). Skipping initial setup...');
  }

  console.log('Finding available ports...');
  const backendPort = await findFreePort(8000);
  console.log(`Backend will use port: ${backendPort}`);
  
  const frontendPort = await findFreePort(3000);
  console.log(`Frontend will use port: ${frontendPort}`);

  console.log('Starting backend...');
  const backendEnv = { ...process.env, PORT: backendPort.toString() };
  const backendProcess = spawn('npm', ['run', 'dev', '--prefix', 'backend'], {
    env: backendEnv,
    stdio: 'inherit',
    shell: true,
  });

  console.log('Starting frontend...');
  const frontendEnv = { 
    ...process.env, 
    PORT: frontendPort.toString(),
    FRONTEND_PORT: frontendPort.toString(),
    BACKEND_PORT: backendPort.toString()
  };
  const frontendProcess = spawn('npm', ['run', 'dev', '--prefix', 'frontend'], {
    env: frontendEnv,
    stdio: 'inherit',
    shell: true,
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    frontendProcess.kill();
    process.exit(code);
  });

  frontendProcess.on('close', (code) => {
    console.log(`Frontend process exited with code ${code}`);
    backendProcess.kill();
    process.exit(code);
  });

  // Handle termination
  process.on('SIGINT', () => {
    backendProcess.kill('SIGINT');
    frontendProcess.kill('SIGINT');
    process.exit();
  });
}

main().catch(console.error);
