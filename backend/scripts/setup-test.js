#!/usr/bin/env node

/**
 * Setup test script for APHELION Backend
 * Tests basic functionality and dependencies
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 APHELION Backend Setup Test\n');

// Check Node.js version
console.log('1. Checking Node.js version...');
try {
  const nodeVersion = execSync('node --version').toString().trim();
  const nodeMajor = parseInt(nodeVersion.replace('v', '').split('.')[0]);
  
  if (nodeMajor >= 18) {
    console.log(`   ✅ Node.js ${nodeVersion} (>= 18 required)`);
  } else {
    console.log(`   ❌ Node.js ${nodeVersion} (>= 18 required)`);
    process.exit(1);
  }
} catch (error) {
  console.log('   ❌ Node.js not found');
  process.exit(1);
}

// Check npm version
console.log('2. Checking npm version...');
try {
  const npmVersion = execSync('npm --version').toString().trim();
  console.log(`   ✅ npm ${npmVersion}`);
} catch (error) {
  console.log('   ❌ npm not found');
  process.exit(1);
}

// Check Docker
console.log('3. Checking Docker...');
try {
  const dockerVersion = execSync('docker --version').toString().trim();
  console.log(`   ✅ ${dockerVersion}`);
} catch (error) {
  console.log('   ⚠️  Docker not found (required for full setup)');
}

// Check Docker Compose
console.log('4. Checking Docker Compose...');
try {
  const composeVersion = execSync('docker-compose --version').toString().trim();
  console.log(`   ✅ ${composeVersion}`);
} catch (error) {
  console.log('   ⚠️  Docker Compose not found (required for full setup)');
}

// Check project structure
console.log('5. Checking project structure...');
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  '.env.example',
  'src/index.ts',
  'src/app.ts'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} (missing)`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n⚠️  Some required files are missing. Please check the project structure.');
}

// Check dependencies
console.log('6. Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const dependencies = Object.keys(packageJson.dependencies || {});
const devDependencies = Object.keys(packageJson.devDependencies || {});

console.log(`   ✅ ${dependencies.length} production dependencies`);
console.log(`   ✅ ${devDependencies.length} development dependencies`);

// Check TypeScript configuration
console.log('7. Checking TypeScript configuration...');
try {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tsconfig.json'), 'utf8'));
  
  if (tsconfig.compilerOptions?.target === 'ES2022') {
    console.log('   ✅ TypeScript target: ES2022');
  } else {
    console.log(`   ⚠️  TypeScript target: ${tsconfig.compilerOptions?.target} (ES2022 recommended)`);
  }
  
  if (tsconfig.compilerOptions?.strict) {
    console.log('   ✅ Strict mode enabled');
  } else {
    console.log('   ⚠️  Strict mode disabled (recommended for TypeScript)');
  }
} catch (error) {
  console.log('   ❌ Failed to read tsconfig.json');
}

// Check environment file
console.log('8. Checking environment configuration...');
const envExamplePath = path.join(__dirname, '..', '.env.example');
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envExamplePath)) {
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  const requiredVars = envExample
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#') && line.includes('='))
    .map(line => line.split('=')[0].trim());
  
  console.log(`   ✅ .env.example found with ${requiredVars.length} variables`);
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = envContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('=')[0].trim());
    
    const missingVars = requiredVars.filter(varName => !envVars.includes(varName));
    
    if (missingVars.length === 0) {
      console.log('   ✅ .env file configured correctly');
    } else {
      console.log(`   ⚠️  .env file missing variables: ${missingVars.join(', ')}`);
    }
  } else {
    console.log('   ⚠️  .env file not found (copy .env.example to .env)');
  }
} else {
  console.log('   ❌ .env.example not found');
}

// Check Docker configuration
console.log('9. Checking Docker configuration...');
const dockerfilePath = path.join(__dirname, '..', 'Dockerfile');
const composePath = path.join(__dirname, '..', 'docker-compose.yml');

if (fs.existsSync(dockerfilePath)) {
  console.log('   ✅ Dockerfile found');
} else {
  console.log('   ⚠️  Dockerfile not found');
}

if (fs.existsSync(composePath)) {
  console.log('   ✅ docker-compose.yml found');
} else {
  console.log('   ⚠️  docker-compose.yml not found');
}

// Summary
console.log('\n📊 Setup Test Summary');
console.log('===================');

console.log('\nNext steps:');
console.log('1. Install dependencies:');
console.log('   npm install');
console.log('\n2. Configure environment:');
console.log('   cp .env.example .env');
console.log('   # Edit .env with your configuration');
console.log('\n3. Start services:');
console.log('   docker-compose up -d');
console.log('\n4. Run in development:');
console.log('   npm run dev');
console.log('\n5. Access the API:');
console.log('   http://localhost:3000/api-docs');

console.log('\n✅ Setup test completed!\n');