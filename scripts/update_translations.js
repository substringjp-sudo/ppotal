const fs = require('fs');
const path = require('path');

const companiesKrPath = path.join(__dirname, '../public/companies_kr.json');
const companiesPath = path.join(__dirname, '../public/rail/companies.json');
const linesPath = path.join(__dirname, '../public/rail/lines.json');

const companiesOutputPath = path.join(__dirname, 'companies_updated.json');
const linesOutputPath = path.join(__dirname, 'lines_updated.json');

function updateTranslations() {
    try {
        // Read source translation file
        console.log('Reading companies_kr.json...');
        const krData = JSON.parse(fs.readFileSync(companiesKrPath, 'utf8'));

        // Update Companies
        console.log('Updating companies.json...');
        const companiesData = JSON.parse(fs.readFileSync(companiesPath, 'utf8'));
        krData.companies.forEach(krCompany => {
            const idStr = krCompany.id.toString();
            if (companiesData[idStr]) {
                companiesData[idStr].name_kr = krCompany.name_kr;
            }
        });

        // Update Lines
        console.log('Updating lines.json...');
        const linesData = JSON.parse(fs.readFileSync(linesPath, 'utf8'));
        krData.lines.forEach(krLine => {
            const idStr = krLine.id.toString();
            if (linesData[idStr]) {
                linesData[idStr].name_kr = krLine.name_kr;
            }
        });

        // Write output files in scripts directory to avoid EPERM issues
        fs.writeFileSync(companiesOutputPath, JSON.stringify(companiesData, null, 1), 'utf8');
        fs.writeFileSync(linesOutputPath, JSON.stringify(linesData, null, 1), 'utf8');

        console.log('Successfully created updated JSON files in the scripts directory:');
        console.log(`- ${companiesOutputPath}`);
        console.log(`- ${linesOutputPath}`);

        // Attempt to copy back to original location
        try {
            const finalCompaniesPath = path.join(__dirname, '../public/rail/companies.json');
            const finalLinesPath = path.join(__dirname, '../public/rail/lines.json');

            fs.writeFileSync(finalCompaniesPath, JSON.stringify(companiesData, null, 1), 'utf8');
            fs.writeFileSync(finalLinesPath, JSON.stringify(linesData, null, 1), 'utf8');
            console.log('Successfully updated original files in public/rail/');
        } catch (e) {
            console.warn('Could not overwrite original files directly due to permissions. Please manually replace them using the files in the scripts directory.');
        }

    } catch (error) {
        console.error('Error updating translations:', error);
    }
}

updateTranslations();
