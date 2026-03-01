const fs = require('fs');
const path = require('path');

const companiesPath = path.join(__dirname, '../public/rail/companies.json');
const linesPath = path.join(__dirname, '../public/rail/lines.json');
const outputPath = path.join(__dirname, 'translation_list.txt');

function prepareTranslation() {
    try {
        let output = '';

        // Process Companies
        console.log('Reading companies.json...');
        const companiesData = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
        output += '=== COMPANIES ===\n';
        Object.values(companiesData).forEach(company => {
            output += `ID: ${company.id}, EN: ${company.name_en}, KR: \n`;
        });
        output += '\n';

        // Process Lines
        console.log('Reading lines.json...');
        const linesData = JSON.parse(fs.readFileSync(linesPath, 'utf8'));
        output += '=== LINES ===\n';
        Object.values(linesData).forEach(line => {
            output += `ID: ${line.id}, EN: ${line.name_en}, KR: \n`;
        });

        fs.writeFileSync(outputPath, output, 'utf8');
        console.log(`Successfully created ${outputPath}`);
    } catch (error) {
        console.error('Error preparing translation list:', error);
    }
}

prepareTranslation();
