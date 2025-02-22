// File Input and Search Elements
const fileUploadInput = document.getElementById("fileUpload");
const recentFilesContainer = document.getElementById("recentFiles");
const searchInput = document.getElementById("keywordSearch");
const tableDisplay = document.getElementById("tableDisplay");
const pdfViewer = document.getElementById("pdfViewer");
function reload() {
    location.reload();
}
// Array to store fetched files
let allFiles = [];

const API_URL = "https://xt6gsecaplq7ig2w2sg65fcqia0uihao.lambda-url.us-east-2.on.aws/";
const FILES_ENDPOINT = "https://www.docfacet.com/vsr/flslt";
const UPLOAD_ENDPOINT = "https://www.docfacet.com/vsr/upldfile";

window.onload = async function () {
    await fetchFiles();
    renderFiles();
    showNoDataMessage();
};

fileUploadInput.addEventListener("change", handleFileSelection);

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

function handleFileSelection(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const file = files[0];
        uploadFile(file);
    }
}

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
            await fetchFiles();
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

function renderFiles() {
    recentFilesContainer.innerHTML = "";

    if (allFiles.length > 0) {
        allFiles.forEach((fileName, index) => {
            let fileItem = document.createElement("div");
            fileItem.classList.add("fileItem");
            fileItem.title = fileName;

            fileItem.innerHTML = `
                <input type="radio" name="recentFile" id="file_${index}" class="fileRadio" title="${fileName}" onchange="loadPDF('${fileName}')">
                <label for="file_${index}" class="fileLabel" title="${fileName}">
                    <span class="fileIcon">📄</span>
                    <span class="fileName">${fileName}</span>
                </label>
            `;

            recentFilesContainer.appendChild(fileItem);
        });
    } else {
        recentFilesContainer.innerHTML = "<p>No recent files available.</p>";
    }
}

async function handleSearch() {
    const searchValue = searchInput.value.trim();
    const selectedFile = document.querySelector('input[name="recentFile"]:checked');

    if (selectedFile && searchValue !== "") {
        const fileName = selectedFile.nextElementSibling.innerText.split("\n")[1];
        const keywords = [...new Set(
            searchValue
                .split(',')
                .map(keyword => keyword.trim().toLowerCase()) // Convert to lowercase
                .filter(item => item !== '') // Remove empty values
        )];
        const requestParams = { payload: { pdf_file_name: fileName, keywords: keywords } };

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
        } catch (error) {
            tableDisplay.innerHTML = `<p class="NoData">Result : ${error.message}</p>`;
        }
    } else {
        showNoDataMessage();
        alert("Please select a file and enter a keyword to search.");
    }
}

function displaySearchResults(data) {
    if (data && Object.keys(data).length > 0) {
        let resultHtml = "<table class='resultTable' border='1'><thead><tr><th>Key</th><th>Page No</th><th>Type</th><th>Details</th></tr></thead><tbody>";

        for (let key in data) {
            if (data[key]) {
                data[key].forEach(item => {
                    let id = item[0];
                    let type = item[1].toUpperCase();
                    let details = Array.isArray(item[2]) ? item[2].join(", ") : item[2];

                    // Highlight only the keyword corresponding to this row's key
                    details = highlightSpecificKeyword(details, key);

                    resultHtml += `<tr onmouseover="showExactPageInDOC(${id})"><td>${key}</td><td>${id}</td><td>${type}</td><td>${details}</td></tr>`;
                });
            } else {
                resultHtml += `<tr><td colspan='4' style="color:red">No data available for ${key}</td></tr>`;
            }
        }

        resultHtml += "</tbody></table>";
        tableDisplay.innerHTML = resultHtml;
    } else {
        tableDisplay.innerHTML = "<p>No matching results found.</p>";
    }
}

// Function to highlight only the specific key for each row
function highlightSpecificKeyword(text, keyword) {
    if (!keyword) return text;

    // Create a case-insensitive regex for the specific key
    const regex = new RegExp(`(${keyword})`, 'gi');

    return text.replace(regex, '<span class="highlight">$1</span>');
}
