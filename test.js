const fs = require('fs');
const check = require('syntax-error');
const { scanDir } = require('./src/util.js');

console.log('checking...\n');

let result = '';

// Loop through each file in the directory
for (let file of scanDir('.')) {
    // Skip node_modules directory and files that don't have .js, .cjs, or .mjs extensions
    if (/\/node_modules|(?<!\.(js|cjs|mjs))$/.test(file)) continue;

    // Read the file content
    const fileContent = fs.readFileSync(file, 'utf8');
    // Check for syntax errors
    const err = check(fileContent, file);

    file = file.replace(process.cwd(), '');
    if (err) {
        // If there are errors, append them to the result string
        result += '\n' + err;
        console.log('error ' + file);
    } else {
        console.log('ok ' + file);
    }
}

// Output all errors
console.error(result);
