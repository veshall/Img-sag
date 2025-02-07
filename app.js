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

async function createDirIfNotExists(dir) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir);
    }
}

let totalDataSize = 0;
let totalFilesCopied = 0;
let totalFilesProcessed = 0;
let totalFilesNotImages = 0;

async function getImageHash(filePath) {
    try {
        const buffer = await fs.readFile(filePath);
        const hash = (
            await sharp(buffer).resize(16, 16).greyscale().raw().toBuffer()
        ).toString("hex");
        return hash;
    } catch (err) {
        console.error(`Error hashing ${filePath}:`, err);
        return null;
    }
}

async function getAllFiles(dir) {
    let files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files = files.concat(await getAllFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

async function processFiles() {
    const spinner = ora("📷 Scanning images...").start(); // Start spinner
    const startTime = Date.now(); // Start timer

    try {
        await createDirIfNotExists(uniqueDir);
        const files = await getAllFiles(sourceDir);
        const fileHashes = new Map();

        // Filter only image files
        const imageFiles = files.filter((file) =>
            allowedExtensions.has(path.extname(file).toLowerCase())
        );
        totalFilesProcessed = imageFiles.length;
        totalFilesNotImages = files.length - totalFilesProcessed;

        // Process images sequentially for proper real-time updates
        for (const filePath of imageFiles) {
            const fileName = path.basename(filePath);

            // Update spinner for each file
            spinner.text = `📂 Processing: ${fileName}`;

            try {
                const hash = await getImageHash(filePath);
                if (!hash) continue;

                if (fileHashes.has(hash)) {
                    // Skip duplicates
                    continue;
                } else {
                    // Copy unique file to unique directory
                    const uniqueFilePath = path.join(uniqueDir, fileName);
                    await fs.copyFile(filePath, uniqueFilePath);
                    console.log(`Copied unique file: ${fileName}`);
                    totalFilesCopied++;
                    const stats = await fs.stat(filePath);
                    totalDataSize += stats.size;
                    fileHashes.set(hash, fileName);
                }
            } catch (err) {
                console.error(`Error processing file ${fileName}:`, err);
            }
        }

        spinner.succeed("📷 Scanning completed!");

        console.log(`Total files processed: ${totalFilesProcessed}`);
        console.log(`Total files not images: ${totalFilesNotImages}`);
        console.log(`Total files copied: ${totalFilesCopied}`);
        console.log(
            `Total data size copied: ${(totalDataSize / (1024 * 1024)).toFixed(2)} MB`
        );
    } catch (err) {
        console.error("Error processing files:", err);
    }
}

processFiles();