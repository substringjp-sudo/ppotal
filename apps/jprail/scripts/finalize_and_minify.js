const fs = require('fs');
const path = require('path');

const filesToMinify = [
    {
        src: path.join(__dirname, '../public/rail/stations_master_updated.json'),
        dest: path.join(__dirname, '../public/rail/stations_master.json')
    },
    {
        src: path.join(__dirname, '../public/rail/companies.json'),
        dest: path.join(__dirname, '../public/rail/companies.json')
    },
    {
        src: path.join(__dirname, '../public/rail/lines.json'),
        dest: path.join(__dirname, '../public/rail/lines.json')
    },
    {
        src: path.join(__dirname, '../public/rail/platforms_meta.json'),
        dest: path.join(__dirname, '../public/rail/platforms_meta.json')
    }
];

function minifyFile(src, dest) {
    try {
        if (!fs.existsSync(src)) {
            console.error(`Source file not found: ${src}`);
            return;
        }
        const data = JSON.parse(fs.readFileSync(src, 'utf8'));
        fs.writeFileSync(dest, JSON.stringify(data));
        console.log(`Successfully minified: ${path.basename(src)} -> ${path.basename(dest)}`);

        // If we overwrote the original file or moved it, we can remove the temporary 'updated' file if it exists
        if (src.includes('_updated.json') && src !== dest) {
            fs.unlinkSync(src);
            console.log(`Removed temporary file: ${path.basename(src)}`);
        }
    } catch (error) {
        console.error(`Error minifying ${src}:`, error.message);
    }
}

console.log('Starting minification process...');
filesToMinify.forEach(file => minifyFile(file.src, file.dest));
console.log('All tasks completed.');
