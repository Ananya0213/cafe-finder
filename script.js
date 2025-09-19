// --- DOM ELEMENTS ---
const container = document.getElementById('cards');
const statusMessage = document.getElementById('status-message');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('location-search-input');
const locationDisplay = document.getElementById('current-location-display');

// Favorites Modal Elements
const favoritesBtn = document.getElementById('favorites-btn');
const favoritesModal = document.getElementById('favorites-modal');
const closeFavoritesModalBtn = document.getElementById('close-favorites-modal-btn');
const favoritesList = document.getElementById('favorites-list');

// Details Modal Elements
const detailsModal = document.getElementById('details-modal');
const closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
const detailsContent = document.getElementById('details-content');


// --- API & APP STATE ---
const apiKey = 'AIzaSyCyVwiDqv-4mq80DCLLTvkxGS7NzPgcyPI'; 
const useProxy = true;
const proxy = 'https://cors-anywhere.herokuapp.com/';
let allCafes = [];
let currentCafes = [];
let favorites = JSON.parse(localStorage.getItem('favoriteCafes')) || [];
let map;
let markers = [];

// --- INITIALIZATION ---
// Called by the Google Maps script in index.html
function initMap() {
    // This function is intentionally left blank for now.
    // The map will be initialized when we get a location.
}

document.addEventListener('DOMContentLoaded', getLocation);


// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', handleSearch);
favoritesBtn.addEventListener('click', showFavoritesModal);
closeFavoritesModalBtn.addEventListener('click', hideFavoritesModal);
closeDetailsModalBtn.addEventListener('click', hideDetailsModal);

favoritesModal.addEventListener('click', (e) => {
    if (e.target === favoritesModal) hideFavoritesModal();
});
detailsModal.addEventListener('click', (e) => {
    if (e.target === detailsModal) hideDetailsModal();
});


// --- GEOLOCATION & SEARCH LOGIC ---
function getLocation() {
    showLoader("Finding your location...");
    const cache = JSON.parse(localStorage.getItem('cachedLocation')) || {};
    const now = Date.now();

    if (cache.timestamp && (now - cache.timestamp < 10 * 60 * 1000)) {
        useLocation(cache.lat, cache.lng);
    } else {
        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            localStorage.setItem('cachedLocation', JSON.stringify({ lat, lng, timestamp: now }));
            useLocation(lat, lng);
        }, () => {
            showStatusMessage("Location access denied or unavailable.");
        });
    }
}

function handleSearch(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
        getCoordsForLocation(query);
    }
}

async function getCoordsForLocation(locationQuery) {
    showLoader(`Searching for ${locationQuery}...`);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationQuery)}&key=${apiKey}`;
    const urlToFetch = useProxy ? proxy + geocodeUrl : geocodeUrl;

    try {
        const response = await fetch(urlToFetch);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            locationDisplay.textContent = `Showing results for: ${data.results[0].formatted_address}`;
            useLocation(location.lat, location.lng);
        } else {
            showStatusMessage(`Could not find location: ${locationQuery}`);
        }
    } catch (e) {
        showStatusMessage("Error fetching location data.");
    }
}

async function useLocation(lat, lng) {
    showLoader("Finding nearby cafes...");
    initializeMap(lat, lng);
    const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&keyword=cafe&key=${apiKey}`;
    const url = useProxy ? proxy + endpoint : endpoint;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            allCafes = data.results;
            currentCafes = [...allCafes]; 
            statusMessage.classList.add('hidden');
            addMarkersToMap(allCafes);
            displayNextCard();
        } else {
            showStatusMessage("No cafes found nearby.");
        }
    } catch (e) {
        showStatusMessage("Error fetching cafes.");
    }
}


// --- MAP FUNCTIONALITY ---
function initializeMap(lat, lng) {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: lat, lng: lng },
        zoom: 12,
        disableDefaultUI: true,
    });
}

function addMarkersToMap(cafes) {
    // Clear old markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    cafes.forEach(cafe => {
        const marker = new google.maps.Marker({
            position: cafe.geometry.location,
            map: map,
            title: cafe.name,
        });
        markers.push(marker);
    });
}


// --- UI & CARD DISPLAY ---
function displayNextCard() {
    container.innerHTML = '';
    if (currentCafes.length === 0) {
        showStatusMessage("You've seen all the cafes! Try a new search.");
        return;
    }
    
    const cafe = currentCafes[0];
    const cardData = {
        name: cafe.name,
        place_id: cafe.place_id,
        photoUrl: cafe.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${cafe.photos[0].photo_reference}&key=${apiKey}` : 'https://placehold.co/400x300/6d4c41/f4f1ea?text=No+Image',
        rating: cafe.rating || 'N/A',
        vicinity: cafe.vicinity
    };

    const card = createCardElement(cardData);
    container.appendChild(card);
    setupSwipe(card, cardData);
}

function createCardElement(data) {
    const wrapper = document.createElement('div');
    wrapper.className = 'swipe-wrapper';

    wrapper.innerHTML = `
        <div class="location-card">
            <div class="swipe-indicator like">LIKE</div>
            <div class="swipe-indicator nope">NOPE</div>
            <img src="${data.photoUrl}" alt="${data.name}" onerror="this.onerror=null;this.src='https://placehold.co/400x300/6d4c41/f4f1ea?text=Image+Error';">
            <div class="card-info">
                <div>
                    <h3>${data.name}</h3>
                    <p>${data.vicinity}</p>
                </div>
                <div class="card-bottom">
                    <p class="rating">⭐ ${data.rating}</p>
                    <button class="details-btn" data-place-id="${data.place_id}">Details</button>
                </div>
            </div>
        </div>
    `;

    wrapper.querySelector('.details-btn').addEventListener('click', () => {
        fetchPlaceDetails(data.place_id);
    });

    return wrapper;
}


function setupSwipe(element, data) {
    const hammertime = new Hammer(element);
    
    hammertime.on('pan', (event) => {
        element.style.transition = 'none';
        element.style.transform = `translate(${event.deltaX}px, ${event.deltaY}px) rotate(${event.deltaX / 10}deg)`;
        
        const likeIndicator = element.querySelector('.like');
        const nopeIndicator = element.querySelector('.nope');

        if (event.deltaX > 0) {
            likeIndicator.style.opacity = event.deltaX / 100;
        } else {
            nopeIndicator.style.opacity = -event.deltaX / 100;
        }
    });

    hammertime.on('panend', (event) => {
        element.style.transition = 'transform 0.4s ease-in-out';
        const moveOutWidth = document.body.clientWidth;

        if (event.deltaX > 100) { // Swipe right
            element.style.transform = `translate(${moveOutWidth}px, ${event.deltaY}px) rotate(30deg)`;
            saveToFavorites(data);
            processNextCard();
        } else if (event.deltaX < -100) { // Swipe left
            element.style.transform = `translate(${-moveOutWidth}px, ${event.deltaY}px) rotate(-30deg)`;
            processNextCard();
        } else { // Return to center
            element.style.transform = '';
        }
    });
}

function processNextCard() {
    currentCafes.shift();
    setTimeout(() => {
        displayNextCard();
    }, 300);
}


// --- DETAILS FUNCTIONALITY ---
async function fetchPlaceDetails(placeId) {
    detailsContent.innerHTML = '<div class="loader-wrapper"><div class="loader"></div></div>';
    detailsModal.classList.remove('hidden');

    const fields = 'name,formatted_phone_number,website,opening_hours,formatted_address';
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
    const urlToFetch = useProxy ? proxy + detailsUrl : detailsUrl;

    try {
        const response = await fetch(urlToFetch);
        const data = await response.json();
        if (data.result) {
            displayPlaceDetails(data.result);
        } else {
            detailsContent.innerHTML = '<p>Could not load details.</p>';
        }
    } catch (e) {
        detailsContent.innerHTML = '<p>Error fetching details.</p>';
    }
}

function displayPlaceDetails(details) {
    let content = `<h3>${details.name}</h3>`;
    content += `<p><strong>Address:</strong> ${details.formatted_address || 'Not available'}</p>`;
    content += `<p><strong>Phone:</strong> ${details.formatted_phone_number || 'Not available'}</p>`;
    content += `<p><strong>Website:</strong> ${details.website ? `<a href="${details.website}" target="_blank">Visit Website</a>` : 'Not available'}</p>`;
    
    if (details.opening_hours) {
        content += '<h4>Opening Hours:</h4><p>' + details.opening_hours.weekday_text.join('<br>') + '</p>';
    }
    detailsContent.innerHTML = content;
}


// --- FAVORITES FUNCTIONALITY ---
function saveToFavorites(cafeData) {
    if (!favorites.some(fav => fav.place_id === cafeData.place_id)) {
        favorites.push(cafeData);
        localStorage.setItem('favoriteCafes', JSON.stringify(favorites));
    }
}

function showFavoritesModal() {
    favoritesList.innerHTML = '';
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p style="padding: 20px; text-align: center;">You haven\'t saved any cafes yet.</p>';
    } else {
        favorites.forEach(cafe => {
            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.innerHTML = `
                <img src="${cafe.photoUrl}" alt="${cafe.name}" onerror="this.onerror=null;this.src='https://placehold.co/60x60/6d4c41/f4f1ea?text=...';">
                <div class="favorite-item-info">
                    <h4>${cafe.name}</h4>
                    <p>⭐ ${cafe.rating}</p>
                </div>
            `;
            favoritesList.appendChild(item);
        });
    }
    favoritesModal.classList.remove('hidden');
}

function hideFavoritesModal() {
    favoritesModal.classList.add('hidden');
}

function hideDetailsModal() {
    detailsModal.classList.add('hidden');
}


// --- UTILITY & STATUS FUNCTIONS ---
function showStatusMessage(message) {
    container.innerHTML = `<div class="status-message"><p>${message}</p></div>`;
    statusMessage.classList.add('hidden');
}

function showLoader(message) {
    container.innerHTML = '';
    statusMessage.innerHTML = `
        <div class="loader-wrapper">
            <div class="loader"></div>
            <p>${message}</p>
        </div>
    `;
    statusMessage.classList.remove('hidden');
}

