var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// filepath: /home/user/Documents/node-repos/Image-Seggregator/src/app.ts
import fs from "fs/promises";
import ora from "ora";
import path from "path";
import sharp from "sharp";
const sourceDir = "image-folder"; // Change to your folder path
const uniqueDir = "unique-images"; // Change to your unique folder
const allowedExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".webp",
]);
function createDirIfNotExists(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield fs.access(dir);
        }
        catch (_a) {
            yield fs.mkdir(dir);
        }
    });
}
let totalDataSize = 0;
let totalFilesCopied = 0;
let totalFilesProcessed = 0;
let totalFilesNotImages = 0;
function getImageHash(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const buffer = yield fs.readFile(filePath);
            const hash = (yield sharp(buffer).resize(16, 16).greyscale().raw().toBuffer()).toString("hex");
            return hash;
        }
        catch (err) {
            console.error(`Error hashing ${filePath}:`, err);
            return null;
        }
    });
}
function getAllFiles(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        let files = [];
        const items = yield fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                files = files.concat(yield getAllFiles(fullPath));
            }
            else {
                files.push(fullPath);
            }
        }
        return files;
    });
}
function processFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        const spinner = ora("📷 Scanning images...").start();
        const startTime = Date.now();
        try {
            yield createDirIfNotExists(uniqueDir);
            const files = yield getAllFiles(sourceDir);
            const fileHashes = new Map();
            const imageFiles = files.filter((file) => allowedExtensions.has(path.extname(file).toLowerCase()));
            totalFilesProcessed = imageFiles.length;
            totalFilesNotImages = files.length - totalFilesProcessed;
            for (const filePath of imageFiles) {
                const fileName = path.basename(filePath);
                spinner.text = `📂 Processing: ${fileName}`;
                try {
                    const hash = yield getImageHash(filePath);
                    if (!hash)
                        continue;
                    if (fileHashes.has(hash)) {
                        continue;
                    }
                    else {
                        const uniqueFilePath = path.join(uniqueDir, fileName);
                        yield fs.copyFile(filePath, uniqueFilePath);
                        console.log(`Copied unique file: ${fileName}`);
                        totalFilesCopied++;
                        const stats = yield fs.stat(filePath);
                        totalDataSize += stats.size;
                        fileHashes.set(hash, fileName);
                    }
                }
                catch (err) {
                    console.error(`Error processing file ${fileName}:`, err);
                }
            }
            spinner.succeed("📷 Scanning completed!");
            console.log(`Total files processed: ${totalFilesProcessed}`);
            console.log(`Total files not images: ${totalFilesNotImages}`);
            console.log(`Total files copied: ${totalFilesCopied}`);
            console.log(`Total data size copied: ${(totalDataSize / (1024 * 1024)).toFixed(2)} MB`);
        }
        catch (err) {
            console.error("Error processing files:", err);
        }
    });
}
processFiles();
