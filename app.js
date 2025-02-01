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

async function processFiles() {
	const spinner = ora("📷 Scanning images...").start(); // Start spinner
	const startTime = Date.now(); // Start timer

	try {
		await createDirIfNotExists(uniqueDir);
		const files = await fs.readdir(sourceDir);
		const fileHashes = new Map();

		// Filter only image files
		const imageFiles = files.filter((file) =>
			allowedExtensions.has(path.extname(file).toLowerCase())
		);
		totalFilesProcessed = imageFiles.length;
		totalFilesNotImages = files.length - totalFilesProcessed;

		// Process images **sequentially** for proper real-time updates
		for (const file of imageFiles) {
			const filePath = path.join(sourceDir, file);

			// Update spinner for **each file**
			spinner.text = `📂 Processing: ${file}`;

			try {
				const hash = await getImageHash(filePath);
				if (!hash || fileHashes.has(hash)) continue;

				fileHashes.set(hash, file);
				const uniqueFilePath = path.join(uniqueDir, file);
				await fs.copyFile(filePath, uniqueFilePath);

				const stats = await fs.stat(filePath);
				totalFilesCopied++;
				totalDataSize += stats.size;
			} catch (err) {
				console.error(`❌ Error processing file ${file}:`, err);
			}
		}

		const endTime = Date.now(); // End timer
		const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

		spinner.succeed("✅ Scan complete!"); // Stop spinner with success message

		console.log("\n Process Summary:");
		console.log(`📁 Total files scanned: ${totalFilesProcessed}`);
		console.log(`🚫 Total files not images: ${totalFilesNotImages}`);
		console.log(`✅ Unique images copied: ${totalFilesCopied}`);
		console.log(
			`💾 Total data size copied: ${(totalDataSize / (1024 * 1024)).toFixed(
				2
			)} MB`
		);
		console.log(`⏳ Time taken: ${timeTaken} seconds`);
	} catch (err) {
		spinner.fail("❌ Error processing files");
		console.error("Error processing files:", err);
	}
}

processFiles();
