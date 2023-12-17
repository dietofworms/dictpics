// Get references to HTML elements
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const imageUpload = document.getElementById('imageUpload');
const uploadButton = document.getElementById('uploadButton');
const uploadedImage = document.getElementById('uploadedImage');
const hideButton = document.getElementById('hideButton');
const termTitle = document.getElementById('termTitle');
const definitionElement = document.getElementById('definition');

// Define the Urban Dictionary API endpoint
const urbanDictionaryAPI = "https://api.urbandictionary.com/v0/define?term=";

// Function to fetch and display search results
async function searchDictionary() {
    const searchTerm = searchInput.value;

    if (searchTerm.trim() === "") {
        definitionElement.innerHTML = "<p>Please enter a search term.</p>";
        return;
    }

    try {
        const response = await fetch(urbanDictionaryAPI + encodeURIComponent(searchTerm));
        if (!response.ok) {
            throw new Error("Failed to fetch data from Urban Dictionary.");
        }

        const data = await response.json();

        if (data.list && data.list.length > 0) {
            const definition = data.list[0].definition;
            definitionElement.innerHTML = `<p>${definition}</p>`;
            termTitle.textContent = searchTerm;
        } else {
            definitionElement.innerHTML = "<p>No definition found.</p>";
        }
    } catch (error) {
        console.error("Error:", error);
        definitionElement.innerHTML = "<p>An error occurred while fetching data.</p>";
    }
}

// Event listener for the search form submission
searchForm.addEventListener('submit', function (event) {
    event.preventDefault();
    searchDictionary();
});

// Event listener for the upload button
uploadButton.addEventListener('click', () => {
    imageUpload.click();
});

// Event listener for the file input change
imageUpload.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            uploadedImage.src = e.target.result;
            uploadedImage.style.display = 'block';
            uploadButton.textContent = "Upload a new image";
            hideButton.style.display = 'block';
        };
        reader.readAsDataURL(this.files[0]);
    }
});

// Event listener for the hide button
hideButton.addEventListener('click', function() {
    uploadButton.style.display = 'none';
    hideButton.style.display = 'none';
});
