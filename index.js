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
            input.type = "radio";
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

// Global variable to store extracted keywords from Excel
let extractedKeywords = new Set();

// Extract Excel File
document.getElementById("excelFile").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
    if (!validExtensions.includes(file.type)) {
        alert("Invalid file type! Please upload an Excel file (.xls or .xlsx).");
        event.target.value = ""; // Reset file input
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Get first sheet name
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Clear extractedKeywords to prevent old values from persisting
        extractedKeywords.clear();
        
        // Extract new keywords while maintaining case sensitivity
        let newKeywords = jsonData.flat().filter(item => typeof item === "string" && item.trim() !== "");

        // Add manually entered values from the search bar
        let existingSearchValues = searchInput.value.split(",").map(val => val.trim()).filter(val => val !== "");

        // Merge all keywords (manual + extracted) into the Set to remove duplicates
        existingSearchValues.forEach(keyword => extractedKeywords.add(keyword));
        newKeywords.forEach(keyword => extractedKeywords.add(keyword));

        // Update search input with unique keywords
        searchInput.value = Array.from(extractedKeywords).join(", ");

        console.log("Updated Extracted Keywords:", Array.from(extractedKeywords));

        alert("Keyword Excel file uploaded successfully!");
    };

    reader.readAsArrayBuffer(file);

    // Reset file input to allow re-uploading the same file with new rows
    event.target.value = "";
});



// Handle Search Functionality
pdfObjectUrl = "";

async function handleSearch() {
    // Get the current search bar values
    let searchValue = searchInput.value.trim();
    // alert(JSON.stringify(searchValue)); // Debugging

    const selectedFile = document.querySelector('input[name="recentFile"]:checked');
    if (!selectedFile) {
        alert("Please select a file to search in.");
        return;
    }

    const fileName = selectedFile.nextElementSibling.innerText.split("\n")[1];

    // Extract keywords from search input (comma-separated)
    let searchKeywords = searchValue 
        ? searchValue.split(',').map(keyword => keyword.trim()).filter(item => item !== '') 
        : [];

    // Use only search bar values; extractedKeywords should not override manual input
    let keywords = searchKeywords.length > 0 ? searchKeywords : [...extractedKeywords];

    // Remove duplicates while maintaining case sensitivity
    let uniqueKeywords = [...new Set(keywords)];

    // Ensure at least one keyword is present
    if (uniqueKeywords.length === 0) {
        alert("Please enter at least one keyword to search.");
        return;
    }

    console.log("Final Keywords List:", uniqueKeywords);

    const requestParams = { payload: { pdf_file_name: fileName, keywords: uniqueKeywords } };
    console.log("Request Parameters:", requestParams);

    tableDisplay.innerHTML = "";

    try {
        const response = await fetch(`${API_URL}?payload=${encodeURIComponent(JSON.stringify(requestParams))}`, {
            method: "POST",
            body: JSON.stringify(requestParams)
        });

        if (!response.ok) {
            throw new Error("No Result Found");
        }

        const data = await response.json();
        displaySearchResults(data);

        // Update the PDF URL
        pdfObjectUrl = data.object_url;
        console.log("New PDF URL:", pdfObjectUrl);

        // Reset the PDF iframe to force reload
        pdfFile.src = "";
        setTimeout(() => {
            pdfFile.src = `${pdfObjectUrl}#page=1`; // Load PDF from the first page
            pdfFile.dataset.src = pdfObjectUrl;
        }, 100); // Small delay to ensure refresh

    } catch (error) {
        tableDisplay.innerHTML = `<p class="NoData">Result: ${error.message}</p>`;
    }
}




// Display Search Results in Table
function displaySearchResults(data) {
    console.log("API Response:", data); // Debugging

    if (!data || !data.search_results || Object.keys(data.search_results).length === 0) {
        tableDisplay.innerHTML = "<p>No matching results found.</p>";
        return;
    }

    let resultHtml = `
        <table class='resultTable' border='1'>
            <thead>
                <tr>
                    <th>Keyword</th>
                    <th>Page No</th>
                    <th>Type</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>`;

    const searchResults = data.search_results; // Extract the actual search results

    for (let keyword in searchResults) {
        let entries = searchResults[keyword];

        if (Array.isArray(entries)) {
            entries.forEach(entry => {
                if (Array.isArray(entry) && entry.length >= 3) {
                    let page = entry[0];
                    let type = entry[1].toUpperCase();
                    let details = Array.isArray(entry[2]) ? entry[2].join(", ") : entry[2];

                    details = highlightSpecificKeyword(details, keyword);

                    resultHtml += `
                        <tr onclick="showPdfPage(${page})">
                            <td>${keyword}</td>
                            <td>${page}</td>
                            <td>${type}</td>
                            <td>${details}</td>
                        </tr>`;
                }
            });
        } else {
            resultHtml += `<tr><td colspan='4' style="color:red">No valid data for ${keyword}</td></tr>`;
        }
    }

    resultHtml += "</tbody></table>";
    tableDisplay.innerHTML = resultHtml;
}


// Highlight Specific Keywords in Search Results
function highlightSpecificKeyword(text, keyword) {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

//--------------------------------------------------------------------------------------------------------------
function showPdfPage(pageNum) {
    console.log("pdfObjectUrl " + pdfObjectUrl);

    console.log("Navigating to page:", pageNum);

    // Ensure pdfFile is a valid embedded PDF object
    if (!pdfFile) {
        console.error("PDF file element is not defined.");
        return;
    }

    // Ensure the PDF URL is stored correctly
    let baseUrl = pdfFile.dataset.src || pdfFile.src.split('#')[0];
    // let baseUrl = pdfObjectUrl;
    // Check if baseUrl is an actual PDF URL (not your webpage URL)
    if (!baseUrl.endsWith(".pdf")) {
        console.error("Invalid PDF URL detected:", baseUrl);
        return;
    }


    // Construct the new URL with the desired page number
    const newUrl = `${baseUrl}#page=${pageNum}`;

    openNewTab = document.getElementById("pdfInNewTab");
    openNewTab.href = newUrl;
    openNewTab.target = "_blank";

    // Force a refresh by resetting the iframe source
    pdfFile.src = "";
    setTimeout(() => {
        pdfFile.src = newUrl;
        console.log("Updated PDF source:", pdfFile.src);
    }, 100); // Small delay to ensure proper reload
}


