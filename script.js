// --- DOM ELEMENTS ---
const container = document.getElementById('cards');
const statusMessage = document.getElementById('status-message');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('location-search-input');
const locationDisplay = document.getElementById('current-location-display');

// Modal Elements
const favoritesBtn = document.getElementById('favorites-btn');
const favoritesModal = document.getElementById('favorites-modal');
const closeFavoritesModalBtn = document.getElementById('close-favorites-modal-btn');
const favoritesList = document.getElementById('favorites-list');

const detailsModal = document.getElementById('details-modal');
const closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
const detailsContent = document.getElementById('details-content');

const viewMapBtn = document.getElementById('view-map-btn');
const mapModal = document.getElementById('map-modal');
const closeMapModalBtn = document.getElementById('close-map-modal-btn');

// --- APP STATE ---
let apiKeyForClientPhotos = ''; // Key for non-essential client-side tasks (photos, map tiles)
let allCafes = [];
let currentCafes = [];
let favorites = JSON.parse(localStorage.getItem('favoriteCafes')) || [];
let map;
let markers = [];
let currentMapCenter = { lat: 0, lng: 0 };

// --- INITIALIZATION ---
function initMap() { }

document.addEventListener('DOMContentLoaded', () => {
    setClientApiKey();
    getLocation();
});


// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', handleSearch);
favoritesBtn.addEventListener('click', showFavoritesModal);
closeFavoritesModalBtn.addEventListener('click', hideFavoritesModal);
detailsModal.addEventListener('click', (e) => { if (e.target === detailsModal) hideDetailsModal(); });
closeDetailsModalBtn.addEventListener('click', hideDetailsModal);
viewMapBtn.addEventListener('click', showMapModal);
closeMapModalBtn.addEventListener('click', hideMapModal);
mapModal.addEventListener('click', (e) => { if (e.target === mapModal) hideMapModal(); });


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
        }, () => { showStatusMessage("Location access denied or unavailable."); });
    }
}

function handleSearch(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
        getCoordsForLocation(query);
    }
}

// *** NEW: CALLS OUR BACKEND ***
async function getCoordsForLocation(locationQuery) {
    showLoader(`Searching for ${locationQuery}...`);
    try {
        const response = await fetch(`/api/get-coords?query=${encodeURIComponent(locationQuery)}`);
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

// *** NEW: CALLS OUR BACKEND ***
async function useLocation(lat, lng) {
    showLoader("Finding nearby cafes...");
    currentMapCenter = { lat, lng };
    try {
        const response = await fetch(`/api/get-cafes?lat=${lat}&lng=${lng}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            allCafes = data.results;
            currentCafes = [...allCafes]; 
            statusMessage.classList.add('hidden');
            displayNextCard();
        } else {
            allCafes = [];
            currentCafes = [];
            showStatusMessage("No cafes found nearby.");
        }
    } catch (e) {
        showStatusMessage("Error fetching cafes.");
    }
}

// *** NEW: CALLS OUR BACKEND ***
async function fetchPlaceDetails(placeId) {
    detailsContent.innerHTML = '<div class="loader-wrapper"><div class="loader"></div></div>';
    detailsModal.classList.remove('hidden');
    try {
        const response = await fetch(`/api/get-details?placeId=${placeId}`);
        const data = await response.json();
        if (data.result) {
            displayPlaceDetails(data.result);
        } else {
            detailsContent.innerHTML = `<p>Could not load details. ${data.details || ''}</p>`;
        }
    } catch (e) {
        detailsContent.innerHTML = '<p>Error fetching details.</p>';
    }
}

// --- UI & CARD DISPLAY (Largely unchanged) ---

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
        photoUrl: cafe.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${cafe.photos[0].photo_reference}&key=${apiKeyForClientPhotos}` : 'https://placehold.co/400x300/6d4c41/f4f1ea?text=No+Image',
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
                <div><h3>${data.name}</h3><p>${data.vicinity}</p></div>
                <div class="card-bottom">
                    <p class="rating">⭐ ${data.rating}</p>
                    <button class="details-btn" data-place-id="${data.place_id}">Details</button>
                </div>
            </div>
        </div>
    `;
    wrapper.querySelector('.details-btn').addEventListener('click', () => fetchPlaceDetails(data.place_id));
    return wrapper;
}

function setupSwipe(element, data) {
    const hammertime = new Hammer(element);
    hammertime.on('pan', (event) => {
        element.style.transition = 'none';
        element.style.transform = `translate(${event.deltaX}px, ${event.deltaY}px) rotate(${event.deltaX / 10}deg)`;
        const likeIndicator = element.querySelector('.like');
        const nopeIndicator = element.querySelector('.nope');
        if (event.deltaX > 0) { likeIndicator.style.opacity = event.deltaX / 100; } 
        else { nopeIndicator.style.opacity = -event.deltaX / 100; }
    });
    hammertime.on('panend', (event) => {
        element.style.transition = 'transform 0.4s ease-in-out';
        const moveOutWidth = document.body.clientWidth;
        if (event.deltaX > 100) {
            element.style.transform = `translate(${moveOutWidth}px, ${event.deltaY}px) rotate(30deg)`;
            saveToFavorites(data);
            processNextCard();
        } else if (event.deltaX < -100) {
            element.style.transform = `translate(${-moveOutWidth}px, ${event.deltaY}px) rotate(-30deg)`;
            processNextCard();
        } else {
            element.style.transform = '';
        }
    });
}

function processNextCard() {
    currentCafes.shift();
    setTimeout(() => displayNextCard(), 300);
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
            item.innerHTML = `<img src="${cafe.photoUrl}" alt="${cafe.name}" onerror="this.onerror=null;this.src='https://placehold.co/60x60/6d4c41/f4f1ea?text=...';"><div class="favorite-item-info"><h4>${cafe.name}</h4><p>⭐ ${cafe.rating}</p></div>`;
            favoritesList.appendChild(item);
        });
    }
    favoritesModal.classList.remove('hidden');
}

function showMapModal() {
    mapModal.classList.remove('hidden');
    setTimeout(() => {
        initializeMap(currentMapCenter.lat, currentMapCenter.lng);
        addMarkersToMap(allCafes);
    }, 100);
}

function initializeMap(lat, lng) {
    if (!map) {
        map = new google.maps.Map(document.getElementById("map"), {
            center: { lat, lng },
            zoom: 12,
            disableDefaultUI: true,
        });
    } else {
        map.setCenter({ lat, lng });
    }
}

function addMarkersToMap(cafes) {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    cafes.forEach(cafe => {
        if (cafe.geometry && cafe.geometry.location) {
            const marker = new google.maps.Marker({
                position: cafe.geometry.location,
                map: map,
                title: cafe.name,
            });
            markers.push(marker);
        }
    });
}

function hideFavoritesModal() { favoritesModal.classList.add('hidden'); }
function hideDetailsModal() { detailsModal.classList.add('hidden'); }
function hideMapModal() { mapModal.classList.add('hidden'); }

function showStatusMessage(message) {
    container.innerHTML = `<div class="status-message"><p>${message}</p></div>`;
    statusMessage.classList.add('hidden');
}

function showLoader(message) {
    container.innerHTML = '';
    statusMessage.innerHTML = `<div class="loader-wrapper"><div class="loader"></div><p>${message}</p></div>`;
    statusMessage.classList.remove('hidden');
}

function setClientApiKey() {
    const mapScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (mapScript) {
        const url = new URL(mapScript.src);
        apiKeyForClientPhotos = url.searchParams.get('key');
    }
}

