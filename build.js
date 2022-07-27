const fs = require("fs");
const path = require("path");
const { obfuscate } = require("javascript-obfuscator");

// Return a string that contains image data
const getImageData = path => `data:image/png;base64,${fs.readFileSync(__dirname + path, "base64")}`;

function generateHash(input) {
    let fullString = "";
    const indexHTML = input || fs.readFileSync(__dirname + "/public/index.html", "utf8")
    indexHTML.split("\n").forEach(function(line) {
        line = line.trim();
        if (line.startsWith("<script src=\"")) { // JavaScript tags
            const scriptSrc = line.replace("<script src=\"", "").replace("\"></script>", "");
            if (scriptSrc.startsWith("./")) {
                fullString += fs.readFileSync(__dirname + "/public" + scriptSrc.replace("./", "/"), "utf8");
            }
        } else if (line.startsWith("<link")) { // CSS and Icons
            let raw;
            if (raw = line.split("=").find(entry => entry.includes(".css")), !!raw) {
                fullString += fs.readFileSync(__dirname + "/public" + raw.split("\"")[1].replace("./", "/"), "utf8");
            } else if (raw = line.split("=").find(entry => entry.includes(".png")), !!raw) {
                // Grab the image and place it in there using getImageData
                fullString += getImageData("/public" + raw.split("\"")[1].replace("./", "/"));
            }
        }
    });
    fullString += indexHTML;
    return require("crypto").createHash('sha256').update(fullString).digest('hex');
}

module.exports = function(replacers) {
    let start = performance.now(),
        version = "v" + require("./package.json").version,
        directory = __dirname + "/builds/";

    console.log("Beginning build", version);

    // Map each line of the HTML file, check if it's a script or link tag and act on it
    indexHTML = fs.readFileSync(__dirname + "/public/index.html", "utf8").split("\n").map(function(line) {
        line = line.trim();
        if (line.startsWith("<script src=\"")) { // JavaScript tags
            const scriptSrc = line.replace("<script src=\"", "").replace("\"></script>", "");
            if (scriptSrc.startsWith("./")) {
                // Read the code
                const fileName = __dirname + "/public" + scriptSrc.replace("./", "/");
                let rawJS = fs.readFileSync(fileName, "utf8");
                // Replace any variables with server prefered keys
                if ("js" in replacers) {
                    for (let [key, value] of Object.entries(replacers.js)) {
                        rawJS = rawJS.replace(key, value);
                    }
                }
                // Obfuscate and replace the code
                line = `<script id="${scriptSrc}">${process.argv.some(arg => arg.includes("no-minify")) ? rawJS : obfuscate(rawJS, {
                    "renameGlobals": true,
                    "target": "browser",
                    "optionsPreset": "medium-obfuscation",
                    "disableConsoleOutput": false
                }).getObfuscatedCode()}</script>`;
                console.log("Compiled JavaScript source file", scriptSrc);
            }
        } else if (line.startsWith("<link")) { // CSS and Icons
            let raw;
            if (raw = line.split("=").find(entry => entry.includes(".css")), !!raw) {
                // Minify the CSS
                const cssSrc = raw.split("\"")[1].replace("./", "/");
                line = `<style id="${cssSrc}">${fs.readFileSync(__dirname + "/public" + cssSrc, "utf8").replace(/\n/g, " ").replace(/^\s+|\s+$/gm, " ")}</style>`;
                console.log("Compiled CascadingStyleSheet source file", cssSrc);
            } else if (raw = line.split("=").find(entry => entry.includes(".png")), !!raw) {
                // Grab the image and place it in there using getImageData
                const imgSrc = raw.split("\"")[1].replace("./", "/");
                line = `<link rel="icon" id="${imgSrc}" href="${getImageData("/public" + imgSrc)}"}>`;
                console.log("Compiled image", imgSrc);
            }
        }
        return line;
    }).join("");
    const hash = generateHash();
    indexHTML = indexHTML.replace("VERSION_ID_HERE", version).replace("VERSION_HASH_HERE", hash);
    fs.writeFileSync(directory + hash + ".html", indexHTML);
    console.log("Finished bundling and building the client in", (performance.now() - start).toFixed(1) + "ms");
    console.log("Build", hash, `(${version})`, "can be found at", directory + hash + ".html");
    return directory + hash + ".html";
}