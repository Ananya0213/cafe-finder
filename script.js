// --- DOM ELEMENTS ---
const container = document.getElementById('cards');
const statusMessage = document.getElementById('status-message');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('location-search-input');
const locationDisplay = document.getElementById('current-location-display');
const favoritesBtn = document.getElementById('favorites-btn');
const favoritesModal = document.getElementById('favorites-modal');
const closeFavoritesModalBtn = document.getElementById('close-favorites-modal-btn');
const favoritesList = document.getElementById('favorites-list');
const detailsModal = document.getElementById('details-modal');
const closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
const detailsContent = document.getElementById('details-content');

// --- API & APP STATE ---
const apiKey = 'AIzaSyCyVwiDqv-4mq80DCLLTvkxGS7NzPgcyPI';
const useProxy = false; // <-- THIS IS THE CRITICAL CHANGE
const proxy = 'https://cors-anywhere.herokuapp.com/';
let allCafes = [];
let currentCafes = [];
let favorites = JSON.parse(localStorage.getItem('favoriteCafes')) || [];
let map;
let markers = [];

// --- INITIALIZATION ---
function initMap() { }
document.addEventListener('DOMContentLoaded', getLocation);

// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', handleSearch);
favoritesBtn.addEventListener('click', showFavoritesModal);
closeFavoritesModalBtn.addEventListener('click', hideFavoritesModal);
closeDetailsModalBtn.addEventListener('click', hideDetailsModal);
favoritesModal.addEventListener('click', (e) => e.target === favoritesModal && hideFavoritesModal());
detailsModal.addEventListener('click', (e) => e.target === detailsModal && hideDetailsModal());

// --- GEOLOCATION & SEARCH ---
function getLocation() {
    showLoader("Finding your location...");
    navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        useLocation(lat, lng);
    }, () => showStatusMessage("Location access denied."));
}

function handleSearch(e) {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) getCoordsForLocation(query);
}

async function getCoordsForLocation(query) {
    showLoader(`Searching for ${query}...`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.results.length) {
            const { lat, lng } = data.results[0].geometry.location;
            locationDisplay.textContent = `Results for: ${data.results[0].formatted_address}`;
            useLocation(lat, lng);
        } else {
            showStatusMessage(`Could not find ${query}.`);
        }
    } catch (err) {
        showStatusMessage("Error fetching location.");
    }
}

async function useLocation(lat, lng) {
    showLoader("Finding nearby cafes...");
    initializeMap(lat, lng);
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&keyword=cafe&key=${apiKey}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.results.length) {
            allCafes = data.results;
            currentCafes = [...allCafes];
            statusMessage.classList.add('hidden');
            addMarkersToMap(allCafes);
            displayNextCard();
        } else {
            showStatusMessage("No cafes found nearby.");
        }
    } catch (err) {
        showStatusMessage("Error fetching cafes.");
    }
}

// --- MAP ---
function initializeMap(lat, lng) {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat, lng },
        zoom: 12,
        disableDefaultUI: true,
    });
}

function addMarkersToMap(cafes) {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    cafes.forEach(cafe => {
        const marker = new google.maps.Marker({
            position: cafe.geometry.location,
            map,
            title: cafe.name,
        });
        markers.push(marker);
    });
}

// --- CARDS ---
function displayNextCard() {
    container.innerHTML = '';
    if (!currentCafes.length) {
        showStatusMessage("You've seen all cafes! Try a new search.");
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
            <img src="${data.photoUrl}" alt="${data.name}" onerror="this.src='https://placehold.co/400x300/6d4c41/f4f1ea?text=Image+Error';">
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
    wrapper.querySelector('.details-btn').addEventListener('click', () => fetchPlaceDetails(data.place_id));
    return wrapper;
}

function setupSwipe(element, data) {
    const hammertime = new Hammer(element);
    hammertime.on('pan', e => {
        element.style.transition = 'none';
        element.style.transform = `translate(${e.deltaX}px, ${e.deltaY}px) rotate(${e.deltaX / 10}deg)`;
        element.querySelector('.like').style.opacity = e.deltaX > 0 ? e.deltaX / 100 : 0;
        element.querySelector('.nope').style.opacity = e.deltaX < 0 ? -e.deltaX / 100 : 0;
    });
    hammertime.on('panend', e => {
        element.style.transition = 'transform 0.4s ease-in-out';
        const moveOutWidth = document.body.clientWidth;
        if (e.deltaX > 100) {
            element.style.transform = `translate(${moveOutWidth}px, ${e.deltaY}px) rotate(30deg)`;
            saveToFavorites(data);
            processNextCard();
        } else if (e.deltaX < -100) {
            element.style.transform = `translate(${-moveOutWidth}px, ${e.deltaY}px) rotate(-30deg)`;
            processNextCard();
        } else {
            element.style.transform = '';
        }
    });
}

function processNextCard() {
    currentCafes.shift();
    setTimeout(displayNextCard, 300);
}

// --- DETAILS ---
async function fetchPlaceDetails(placeId) {
    detailsContent.innerHTML = '<div class="loader-wrapper"><div class="loader"></div></div>';
    detailsModal.classList.remove('hidden');
    const fields = 'name,formatted_phone_number,website,opening_hours,formatted_address';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
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
    content += `<p><strong>Address:</strong> ${details.formatted_address || 'N/A'}</p>`;
    content += `<p><strong>Phone:</strong> ${details.formatted_phone_number || 'N/A'}</p>`;
    content += `<p><strong>Website:</strong> ${details.website ? `<a href="${details.website}" target="_blank">Visit Website</a>` : 'N/A'}</p>`;
    if (details.opening_hours) {
        content += '<h4>Hours:</h4><p>' + details.opening_hours.weekday_text.join('<br>') + '</p>';
    }
    detailsContent.innerHTML = content;
}

// --- FAVORITES ---
function saveToFavorites(cafeData) {
    if (!favorites.some(fav => fav.place_id === cafeData.place_id)) {
        favorites.push(cafeData);
        localStorage.setItem('favoriteCafes', JSON.stringify(favorites));
    }
}

function showFavoritesModal() {
    favoritesList.innerHTML = '';
    if (!favorites.length) {
        favoritesList.innerHTML = '<p style="padding: 20px; text-align: center;">No saved cafes yet.</p>';
    } else {
        favorites.forEach(cafe => {
            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.innerHTML = `
                <img src="${cafe.photoUrl}" alt="${cafe.name}" onerror="this.src='https://placehold.co/60x60/6d4c41/f4f1ea?text=...';">
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

// --- MODAL & STATUS UTILITIES ---
function hideFavoritesModal() {
    favoritesModal.classList.add('hidden');
}

function hideDetailsModal() {
    detailsModal.classList.add('hidden');
}

function showStatusMessage(message) {
    container.innerHTML = `<div class="status-message"><p>${message}</p></div>`;
    statusMessage.classList.remove('hidden');
}

function showLoader(message) {
    statusMessage.innerHTML = `
        <div class="loader-wrapper">
            <div class="loader"></div>
            <p>${message}</p>
        </div>
    `;
    statusMessage.classList.remove('hidden');
    container.innerHTML = '';
}

