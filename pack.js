// This script generates Firefox version of the extension and packs Chrome and Firefox versions to zip files.

const fsp = require('fs').promises;
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function copyDir(src, dest) {
    const entries = await fsp.readdir(src, { withFileTypes: true });
    await fsp.mkdir(dest);
    for (let entry of entries) {
        if(entry.name === '.git' || entry.name === '.github' || entry.name === '_metadata' || entry.name === 'node_modules') continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fsp.copyFile(srcPath, destPath);
        }
    }
}

if(fs.existsSync('../OldTweetDeckTempChrome')) {
    fs.rmSync('../OldTweetDeckTempChrome', { recursive: true });
}
if(fs.existsSync('../OldTweetDeckFirefox')) {
    fs.rmSync('../OldTweetDeckFirefox', { recursive: true });
}

console.log("Copying...");
copyDir('./', '../OldTweetDeckFirefox').then(async () => {
    await copyDir('./', '../OldTweetDeckTempChrome');
    console.log("Copied!");
    console.log("Patching...");

    let manifest = JSON.parse(await fsp.readFile('../OldTweetDeckTempChrome/manifest.json', 'utf8'));
    manifest.browser_specific_settings = {
        gecko: {
            id: "oldtweetdeck@dimden.dev",
            strict_min_version: "90.0"
        }
    };
    manifest.manifest_version = 2;
    manifest.host_permissions.push("https://tweetdeck.dimden.dev/*", "https://raw.githubusercontent.com/*");
    delete manifest.declarative_net_request;
    manifest.permissions.push("webRequest", "webRequestBlocking", ...manifest.host_permissions);
    delete manifest.host_permissions;
    for(let content_script of manifest.content_scripts) {
        if(content_script.world === "MAIN") {
            delete content_script.world;
        }
        content_script.js = content_script.js.filter(js => js !== "src/destroyer.js");
    }
    manifest.background = {
        scripts: ["src/background.js"],
    }
    manifest.web_accessible_resources = manifest.web_accessible_resources[0].resources;

    fs.unlinkSync('../OldTweetDeckFirefox/pack.js');
    fs.unlinkSync('../OldTweetDeckTempChrome/pack.js');
    fs.unlinkSync('../OldTweetDeckFirefox/README.md');
    fs.unlinkSync('../OldTweetDeckTempChrome/README.md');
    fs.unlinkSync('../OldTweetDeckFirefox/package.json');
    fs.unlinkSync('../OldTweetDeckTempChrome/package.json');
    fs.unlinkSync('../OldTweetDeckFirefox/package-lock.json');
    fs.unlinkSync('../OldTweetDeckTempChrome/package-lock.json');
    fs.unlinkSync('../OldTweetDeckFirefox/.gitignore');
    fs.unlinkSync('../OldTweetDeckTempChrome/.gitignore');
    fs.writeFileSync('../OldTweetDeckFirefox/manifest.json', JSON.stringify(manifest, null, 2));

    console.log("Patched!");

    console.log("Zipping Firefox version...");
    try {
        const zip = new AdmZip();
        const outputDir = "../OldTweetDeckFirefox.zip";
        zip.addLocalFolder("../OldTweetDeckFirefox");
        zip.writeZip(outputDir);
    } catch (e) {
        console.log(`Something went wrong ${e}`);
    }
    console.log("Zipping Chrome version...");
    try {
        const zip = new AdmZip();
        const outputDir = "../OldTweetDeckChrome.zip";
        zip.addLocalFolder("../OldTweetDeckTempChrome");
        zip.writeZip(outputDir);
    } catch (e) {
        console.log(`Something went wrong ${e}`);
    }
    console.log("Zipped!");
    console.log("Deleting temporary folders...");
    fs.rmSync('../OldTweetDeckTempChrome', { recursive: true });
    fs.rmSync('../OldTweetDeckFirefox', { recursive: true });
    console.log("Deleted!");
});