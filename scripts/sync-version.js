import fs from 'fs';

// 读取 package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;

// 更新 tauri.conf.json
const tauriConfigPath = 'src-tauri/tauri.conf.json';
if (fs.existsSync(tauriConfigPath)) {
  const tauriConfig = JSON.parse(fs.readFileSync(tauriConfigPath, 'utf8'));
  tauriConfig.version = version;
  fs.writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2));
  console.log(`Synced version ${version} to tauri.conf.json`);
}

// 更新 Cargo.toml
const cargoPath = 'src-tauri/Cargo.toml';
if (fs.existsSync(cargoPath)) {
  let cargoContent = fs.readFileSync(cargoPath, 'utf8');
  cargoContent = cargoContent.replace(
    /^version = "[^"]+"/m,
    `version = "${version}"`
  );
  fs.writeFileSync(cargoPath, cargoContent);
  console.log(`Synced version ${version} to Cargo.toml`);
}

console.log('Version sync completed!');
