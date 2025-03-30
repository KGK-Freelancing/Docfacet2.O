// File Input and Search Elements
const fileUploadInput = document.getElementById("fileUpload");
const recentFilesContainer = document.getElementById("recentFiles");
const searchInput = document.getElementById("keywordSearch");
const tableDisplay = document.getElementById("tableDisplay");
const pdfFile = document.getElementById("pdfCanvas");
// API Endpoints
const API_URL = "https://xt6gsecaplq7ig2w2sg65fcqia0uihao.lambda-url.us-east-2.on.aws/";
const FILES_ENDPOINT = "https://www.docfacet.com/vsr/flslt";
const UPLOAD_ENDPOINT = "https://www.docfacet.com/vsr/upldfile";

// Store all fetched files
let allFiles = [];

// Reload Page Function
function reload() {
    location.reload();
}

// On Page Load, Fetch and Render Files
window.onload = async function () {
    await fetchFiles();
    renderFiles();
    showNoDataMessage();
};

// File Upload Event Listener
fileUploadInput.addEventListener("change", handleFileSelection);

// Show "No Data Available" Message
function showNoDataMessage() {
    if (allFiles.length === 0) {
        tableDisplay.innerHTML = `
            <div class="noDataMessage">
                <img src="https://img.freepik.com/free-vector/flat-design-no-data-illustration_23-2150527124.jpg" 
                    alt="No Data Available" 
                    style="max-width: 100%; height: auto;">
            </div>
        `;
    }
}

// Handle File Selection and Upload
function handleFileSelection(event) {
    const files = event.target.files;
    if (files.length > 0) {
        uploadFile(files[0]);
    }
}

// Upload File to Server
async function uploadFile(file) {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    const loadingSpinner = document.getElementById("loading-spinner");
    const loadingMessage = document.getElementById("loading-message");
    loadingSpinner.style.display = "block";
    loadingMessage.textContent = "Uploading...";

    reader.onload = async function () {
        const base64String = reader.result.split(",")[1];
        const payload = {
            payload: {
                filename: file.name,
                pdf_b64_str: base64String,
                contentType: file.type
            }
        };

        try {
            const response = await fetch(UPLOAD_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("File upload failed");
            }

            loadingMessage.textContent = "File uploaded successfully!";
            await fetchFiles(); // Refresh file list
        } catch (error) {
            console.error("Error uploading file:", error.message);
            loadingMessage.textContent = "Error uploading file. Please try again.";
        } finally {
            setTimeout(() => {
                loadingSpinner.style.display = "none";
            }, 2000);
        }
    };
}

// Fetch Files from Server
async function fetchFiles() {
    try {
        const response = await fetch(FILES_ENDPOINT, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            throw new Error("Failed to fetch files");
        }

        const data = await response.json();
        allFiles = data?.top_10_files || [];
        renderFiles();
    } catch (error) {
        console.error("Error fetching files:", error.message);
        recentFilesContainer.innerHTML = "<p>Error loading files. Please try again later.</p>";
    }
}

// Render File List
function renderFiles() {
    recentFilesContainer.innerHTML = "";

    if (allFiles.length > 0) {
        allFiles.forEach((fileName, index) => {
            let fileItem = document.createElement("div");
            fileItem.classList.add("fileItem");
            fileItem.title = fileName;

            let input = document.createElement("input");
            input.type = "checkbox";
            input.name = "recentFile";
            input.id = `file_${index}`;
            input.classList.add("fileRadio");
            input.title = fileName;

            let label = document.createElement("label");
            label.setAttribute("for", `file_${index}`);
            label.classList.add("fileLabel");
            label.title = fileName;

            label.innerHTML = `
                <span class="fileIcon">📄</span>
                <span class="fileName">${fileName}</span>
            `;

            fileItem.appendChild(input);
            fileItem.appendChild(label);
            recentFilesContainer.appendChild(fileItem);
        });
    } else {
        recentFilesContainer.innerHTML = "<p>No recent files available.</p>";
    }
}



// Global object to store keywords and their associated documents
let keywordToDocsMap = {};

// Reference to file name display element
const fileNameDisplay = document.getElementById("fileNameDisplay");

document.getElementById("excelFile").addEventListener("change", function (event) {
    const fileInput = event.target;
    const file = fileInput.files[0];

    if (!file) {
        console.warn("No file selected.");
        return;
    }

    // Clear existing keyword map
    keywordToDocsMap = {};

    // Reset search input field
    searchInput.value = "";

    // Update file name display
    if (fileNameDisplay) {
        fileNameDisplay.textContent = `Uploaded File: ${file.name}`;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON (Array of Arrays)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        console.log("Excel data loaded:", jsonData);

        // Process each row and merge with existing keywords
        jsonData.forEach((row, index) => {
            if (index === 0) return; // Skip header row

            const keyword = row[0]?.toString().trim();
            const documentList = row.slice(1)
                .filter(item => item) // Ignore empty cells
                .map(item => item.toString().trim());

            if (keyword) {
                keywordToDocsMap[keyword] = documentList;
            }
        });

        console.log("Final Keyword Map after file upload:", keywordToDocsMap);
        alert(`Keywords from "${file.name}" have been successfully updated!`);

        // Refresh display (if applicable)
        displayKeywordDocumentMap(keywordToDocsMap);
        displayKeywordOnly(keywordToDocsMap);
        displayDocumentsOnly(keywordToDocsMap);

        // ✅ Reset the file input to allow re-uploading the same file
        fileInput.value = "";
    };

    reader.readAsArrayBuffer(file);
});



// Function to display the result
function displayKeywordDocumentMap(map) {
    let output = "";
    for (let [keyword, docs] of Object.entries(map)) {
        output += `Keyword: ${keyword}\nDocuments: ${docs.join(", ")}\n\n`;
    }
    console.log(output);
}

// // Function to display the result
// function displayKeywordDocumentMap(map) {
//     let fileKeywordMap = [];

//     // Iterate through each keyword and corresponding document list
//     for (let [keyword, docs] of Object.entries(map)) {
//         docs.forEach(fileName => {
//             // Check if the fileName already exists in fileKeywordMap
//             let existingEntry = fileKeywordMap.find(entry => entry.fileName === fileName);

//             if (existingEntry) {
//                 // Append the keyword to the existing file entry
//                 existingEntry.keywords.push(keyword);
//             } else {
//                 // Create a new entry for the file with the current keyword
//                 fileKeywordMap.push({
//                     fileName: fileName,
//                     keywords: [keyword]
//                 });
//             }
//         });
//     }

//     // Log the JSON output
//     console.log(JSON.stringify(fileKeywordMap, null, 4));
// }
// Function to display keywords only (removes duplicates)
function displayKeywordOnly(map) {
    let keywords = Object.keys(map);

    // Remove duplicates and trim spaces from individual keywords
    let uniqueKeywords = [...new Set(keywords.flatMap(k => k.split(",").map(item => item.trim())))];

    console.log("Extracted Keywords (No Duplicates):", uniqueKeywords);

    // Concatenate unique keywords with commas
    let searchKeyword = uniqueKeywords.join(", ");
    searchInput.value = searchKeyword;
}



// Function to display documents only
var extractedDocuments = "";

function displayDocumentsOnly(map) {
    // ✅ Clear previous extractedDocuments before adding new ones
    extractedDocuments = "";

    let documents = [];

    Object.values(map).forEach(docList => {
        documents = documents.concat(docList); // Flatten array instead of nesting
    });

    // ✅ Store only the new sheet's documents
    extractedDocuments = documents.join(", ");

    console.log("Extracted Documents from new sheet:", extractedDocuments);

    // ✅ Display documents in UI (if applicable)
    const documentDisplay = document.getElementById("documentList"); // Make sure this exists in HTML
    if (documentDisplay) {
        documentDisplay.innerHTML = documents.map(doc => `<li>${doc}</li>`).join("");
    }
}





// Show loading spinner and message
const loadingSpinner = document.getElementById("loading-spinner");
const loadingMessage = document.getElementById("loading-message");

// Store object URLs per file
var pdfObjectUrls = {};

async function handleSearch() {
    loadingSpinner.style.display = "block";
    loadingMessage.textContent = "Loading...";

    console.log("File List " + extractedDocuments.split(","));

    // Get the current search bar values
    let searchValue = searchInput.value.trim();
    console.log("searchValue " + searchValue);


    // Get selected files
    let selectedFiles = document.querySelectorAll('input[name="recentFile"]:checked');
    // console.log("Selected Files (Before Removing Duplicates):", selectedFiles);

    // if (selectedFiles.length === 0) {
    //     alert("Please select at least one file to search in.");
    //     loadingSpinner.style.display = "none";
    //     return;
    // }

    // Extract keywords from search input (comma-separated)
    let searchKeywords = searchValue
        ? searchValue.split(',').map(keyword => keyword.trim()).filter(item => item !== '')
        : [];

    // Clear searchKeywords if input is empty
    if (searchValue === "" || searchKeywords.length === 0) {
        alert("Please enter at least one keyword to search.");
        loadingSpinner.style.display = "none";
        return;
    }

    // Remove duplicates regardless of case sensitivity
    let uniqueKeywords = [...new Map(searchKeywords.map(item => [item.toLowerCase(), item])).values()];
    console.log("Final Keywords List:", uniqueKeywords);


    // Define the extracted document list
    var ExtractedDocList = extractedDocuments;

    // Get unique file names
    let uniqueFileNames = new Set();

    // Add file names from selectedFiles
    selectedFiles.forEach(eachFile => {
        let fileName = eachFile.nextElementSibling?.innerText.split("\n")[1];
        if (fileName) uniqueFileNames.add(fileName.trim());
    });

    // Add file names from ExtractedDocList
    ExtractedDocList.split(",").forEach(doc => {
        const trimmedDoc = doc.trim();
        if (trimmedDoc) { // Only add if it's not an empty string
            uniqueFileNames.add(trimmedDoc);
        }
    });


    console.log("Unique File Names:", Array.from(uniqueFileNames));

    if (uniqueFileNames.size === 0) {
        alert("No valid file names found for search.");
        loadingSpinner.style.display = "none";
        return;
    }

    tableDisplay.innerHTML = ""; // Clear previous results

    // Initialize an array to store all search results
    let allResults = [];
    pdfObjectUrls = {}; // Clear previous URLs

    // Loop through each unique file
    for (let fileName of uniqueFileNames) {
        try {
            console.log("Searching in File:", fileName);

            const requestParams = {
                payload: {
                    pdf_file_name: fileName,
                    keywords: uniqueKeywords
                }
            };

            console.log("Request Parameters:", requestParams);

            // Make the API request for each unique file
            const response = await fetch(`${API_URL}`, {
                method: "POST",
                body: JSON.stringify(requestParams),
            });

            if (!response.ok) {
                throw new Error(`No result found for ${fileName}`);
            }

            const data = await response.json();
            console.log(`Response for ${fileName}:`, data);

            // Store object URL per file
            if (data && data["object_url"]) {
                pdfObjectUrls[fileName] = data["object_url"];
            }

            if (data && data.search_results && Object.keys(data.search_results).length > 0) {
                // Store results with the file name
                allResults.push({ fileName, results: data.search_results });
            } else {
                // If no results found for this file
                allResults.push({ fileName, results: null });
            }

        } catch (error) {
            console.error(`Error during fetch for ${fileName}:`, error);
            allResults.push({ fileName, error: error.message });
        }
    }

    console.log("Final pdfObjectUrls:", pdfObjectUrls); // Verify all stored URLs

    // Once all requests are done, display the results
    displayAllResults(allResults);

    // Hide loading spinner and message once all results are displayed
    loadingSpinner.style.display = "none";
    loadingMessage.textContent = "";
}



// Display Results in a Table
function displayAllResults(allResults) {
    if (allResults.length === 0) {
        tableDisplay.innerHTML = "<p>No results found.</p>";
        return;
    }

    let resultHtml = `
        <table class='resultTable' border='1'>
            <thead>
                <tr>
                    <th>File Name</th>
                    <th>Keyword</th>
                    <th>Page No</th>
                    <th>Type</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>`;

    allResults.forEach(fileResult => {
        const { fileName, results, error } = fileResult;

        if (error) {
            resultHtml += `
                <tr>
                    <td colspan='5' style="color: red; text-align: center; background-color:#fad9e0">
                                <!-- ${fileName}: ${error} -->
                        ${error}
                    </td>
                </tr>`;
        } else if (results) {
            for (let keyword in results) {
                let entries = results[keyword];

                if (Array.isArray(entries)) {
                    entries.forEach(entry => {
                        if (Array.isArray(entry) && entry.length >= 3) {
                            let [page, type, details] = entry;
                            type = type.toUpperCase();
                            details = Array.isArray(details) ? details.join(", ") : details;
                            details = highlightSpecificKeyword(details, keyword);

                            // Pass fileName to identify the correct PDF
                            resultHtml += `
                                <tr id="selectedRow" onclick="showPdfPage('${fileName}', ${page}, '${keyword}')">
                                    <td>${fileName}</td>
                                    <td>${keyword}</td>
                                    <td>${page}</td>
                                    <td>${type}</td>
                                    <td>${details}</td>
                                </tr>`;
                        }
                    });
                } else {
                    resultHtml += `
                        <tr>
                            <td>${fileName}</td>
                            <td>${keyword}</td>
                            <td colspan='3' style="color: red;">No valid data</td>
                        </tr>`;
                }
            }
        } else {
            resultHtml += `
                <tr>
                    <td>${fileName}</td>
                    <td colspan='4' style="color: red; text-align: center;">
                        No matching results found
                    </td>
                </tr>`;
        }
    });

    resultHtml += "</tbody></table>";
    tableDisplay.innerHTML = resultHtml;
}

// Highlight Keywords in Results

function highlightSpecificKeyword(text, keyword) {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// Show PDF Page Dynamically Based on File using PDF.js
function showPdfPage(fileName, pageNum, keywords) {
    console.log("showPdfPage " + keywords);

    // Remove 'showAsSelected' from any previously selected row
    const previousSelectedRow = document.querySelector("#showAsSelected");
    if (previousSelectedRow) {
        previousSelectedRow.id = "";
    }

    // Select the current row dynamically
    const currentRow = document.querySelector(`[data-file-name='${fileName}']`);
    if (currentRow) {
        currentRow.id = "showAsSelected";
    }

    if (!pdfObjectUrls || typeof pdfObjectUrls[fileName] !== 'string') {
        console.error(`No PDF URL found for file: ${fileName}`);
        alert(`No PDF URL found for file: ${fileName}`);
        return;
    }

    const baseUrl = pdfObjectUrls[fileName].trim();
    if (!baseUrl || !baseUrl.match(/^https?:\/\/.+\.pdf$/)) {
        console.error("Invalid PDF URL detected:", baseUrl);
        alert("Invalid PDF URL detected.");
        return;
    }

    const newUrl = `${baseUrl}#page=${pageNum}`;
    const canvas = document.getElementById('pdfCanvas');
    const context = canvas.getContext('2d');

    if (!Array.isArray(keywords)) {
        console.warn('Keywords should be an array. Converting to array.');
        keywords = keywords ? [keywords] : [];
    }
    console.log('Keywords for highlighting:', keywords);

    pdfjsLib.getDocument(baseUrl).promise.then(function (pdfDoc) {
        return pdfDoc.getPage(pageNum);
    }).then(function (page) {
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport,
        };

        return page.render(renderContext).promise.then(() => {
            return page.getTextContent();
        }).then(textContent => {
            if (keywords.length > 0) {
                highlightText(canvas, textContent, viewport, keywords);
            } else {
                console.warn('No keywords provided for highlighting. Skipping highlight process.');
            }
        });
    }).catch(function (error) {
        console.error('Error loading PDF:', error);
    });

    const openNewTab = document.getElementById("pdfInNewTab");
    openNewTab.href = newUrl;
    openNewTab.target = "_blank";

    pdfFile.src = "";
    setTimeout(() => {
        pdfFile.src = newUrl;
    }, 100);
}

function highlightText(canvas, textContent, viewport, keywords) {
    const context = canvas.getContext('2d');
    context.globalAlpha = 0.5;
    context.fillStyle = 'yellow';

    textContent.items.forEach(item => {
        if (item && item.str) {
            keywords.forEach(keyword => {
                if (keyword && keyword.toLowerCase) {
                    const regex = new RegExp(keyword, 'gi');
                    let match;
                    while ((match = regex.exec(item.str)) !== null) {
                        // alert(match[0]); // Alerts the exact matched keyword
                        console.log(match[0]);

                        const bounds = pdfjsLib.Util.transform(viewport.transform, item.transform);
                        const textWidth = context.measureText(match[0]).width;
                        const textHeight = item.height; // Direct height from PDF.js text item

                        context.fillRect(bounds[4], canvas.height - bounds[5], textWidth, textHeight);

                    }
                }
            });
        }
    });
}


// // Show PDF Page Dynamically Based on File
// function showPdfPage(fileName, pageNum) {
//     // Remove 'showAsSelected' from any previously selected row
//     const previousSelectedRow = document.querySelector("#showAsSelected");
//     if (previousSelectedRow) {
//         previousSelectedRow.id = "";
//     }

//     // Select the current row dynamically
//     const currentRow = document.querySelector(`[data-file-name='${fileName}']`);
//     if (currentRow) {
//         currentRow.id = "showAsSelected";
//     }

//     // Validate if the pdfObjectUrls object exists and has the file
//     if (!pdfObjectUrls || typeof pdfObjectUrls[fileName] !== 'string') {
//         console.error(`No PDF URL found for file: ${fileName}`);
//         alert(`No PDF URL found for file: ${fileName}`);
//         return;
//     }

//     const baseUrl = pdfObjectUrls[fileName].trim();

//     // Ensure the URL is a valid string
//     if (!baseUrl) {
//         console.error("Empty PDF URL detected.");
//         alert("Empty PDF URL detected.");
//         return;
//     }

//     // Validate the URL format
//     if (!baseUrl.match(/^https?:\/\/.+\.pdf$/)) {
//         console.error("Invalid PDF URL detected:", baseUrl);
//         alert("Invalid PDF URL detected.");
//         return;
//     }

//     // Construct the new URL with the page number
//     const newUrl = `${baseUrl}#page=${pageNum}`;

//     // Check if the pdfFile element exists
//     if (typeof pdfFile === "undefined" || !pdfFile) {
//         console.error("PDF viewer element not found.");
//         alert("PDF viewer element not found.");
//         return;
//     }

//     openNewTab = document.getElementById("pdfInNewTab");
//     openNewTab.href = newUrl;
//     openNewTab.target = "_blank";

//     // Clear the current source and update after a slight delay
//     pdfFile.src = "";

//     setTimeout(() => {
//         pdfFile.src = newUrl;
//         console.log(`Updated PDF source for ${fileName}:`, pdfFile.src);
//     }, 100);
// }



// Download search Table 
document.getElementById("downloadResult").addEventListener("click", function () {
    const table = document.getElementById("tableDisplay");
    console.log(table);

    // Check if the table contains an image element
    if (table.querySelector("img.noDataFound")) {
        alert("No table found to download!");
        return;
    }


    let csv = [];
    const rows = table.querySelectorAll("tr");

    rows.forEach((row, index) => {
        let cols = row.querySelectorAll("th, td");
        let rowData = [];

        cols.forEach(col => {
            // Escape commas, quotes, and newlines
            let data = col.innerText.replace(/"/g, '""').replace(/\n/g, " ");

            // Highlight header row by converting to uppercase
            if (index === 0) {
                data = data.toUpperCase();
            }

            rowData.push(`"${data}"`); // Wrap each value in quotes for CSV format
        });

        csv.push(rowData.join(",")); // Join columns with commas
    });

    // Create CSV Blob
    let csvFile = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });

    // Create Download Link
    let downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(csvFile);
    downloadLink.download = "SearchResults.csv";
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
});
