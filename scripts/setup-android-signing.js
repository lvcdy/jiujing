#!/usr/bin/env node
/**
 * 为 Tauri Android 项目注入签名配置到 build.gradle.kts
 * 用法: node scripts/setup-android-signing.js <keystore_path>
 */
import fs from 'fs';
import path from 'path';

const keystorePath = process.argv[2];
if (!keystorePath) {
  console.error('Usage: node setup-android-signing.js <keystore_path>');
  process.exit(1);
}

const gradleDir = 'src-tauri/gen/android';
const gradleFile = path.join(gradleDir, 'app', 'build.gradle.kts');
const propsFile = path.join(gradleDir, 'keystore.properties');

// 读取 build.gradle.kts
if (!fs.existsSync(gradleFile)) {
  console.error(`File not found: ${gradleFile}`);
  process.exit(1);
}

let content = fs.readFileSync(gradleFile, 'utf8');

// 1. 添加 import 语句
const importsToAdd = ['import java.io.FileInputStream', 'import java.util.Properties'];
for (const imp of importsToAdd) {
  if (!content.includes(imp)) {
    content = imp + '\n' + content;
    console.log(`Added ${imp}`);
  }
}

// 2. 注入 signingConfigs 块（在 buildTypes 之前）
if (!content.includes('signingConfigs')) {
  const signingBlock = `
signingConfigs {
    create("release") {
        val keystorePropertiesFile = rootProject.file("keystore.properties")
        val keystoreProperties = Properties()
        if (keystorePropertiesFile.exists()) {
            keystoreProperties.load(FileInputStream(keystorePropertiesFile))
        }
        keyAlias = keystoreProperties["keyAlias"] as String
        keyPassword = keystoreProperties["password"] as String
        storeFile = file(keystoreProperties["storeFile"] as String)
        storePassword = keystoreProperties["password"] as String
    }
}
`;
  content = content.replace(/(buildTypes\s*\{)/, signingBlock + '\n$1');
  console.log('Injected signingConfigs block');
}

// 3. 为 release buildType 添加 signingConfig 引用
if (!content.includes('signingConfig')) {
  content = content.replace(
    /getByName\("release"\)\s*\{/g,
    'getByName("release") {\n            signingConfig = signingConfigs.getByName("release")'
  );
  console.log('Added signingConfig reference to release buildType');
}

fs.writeFileSync(gradleFile, content);
console.log(`Updated ${gradleFile}`);

// 4. 写入 keystore.properties
const props = [
  `keyAlias=${process.env.KEY_ALIAS || 'debug'}`,
  `password=${process.env.KEY_PASSWORD || 'android'}`,
  `storeFile=${keystorePath}`,
].join('\n') + '\n';

fs.writeFileSync(propsFile, props);
console.log(`Written ${propsFile}`);
