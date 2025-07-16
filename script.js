// --- DATABASE CONNECTION ---
const SUPABASE_URL = 'https://iyhjrhxuonbeekpdenys.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5aGpyaHh1b25iZWVrcGRlbnlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2NTM4MDEsImV4cCI6MjA2ODIyOTgwMX0.ppOvKXLAJa7kARtJ49Ju5pgYfy2FklM2DLh08Z84Lwo';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GLOBAL VARIABLES ---
let allFarms = [];
let map = null;
let isMapInitialized = false;
let detailsMap = null;

// --- SELECTING ELEMENTS ---
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');
const farmListContainer = document.querySelector('#farm-list-container');
const searchInput = document.querySelector('.search-area input');
const farmsHeading = document.querySelector('#farms-heading');
const authContainer = document.querySelector('#auth-container');
const profileDetailsContainer = document.querySelector('#profile-details-container');
const signupForm = document.querySelector('#signup-form');
const loginForm = document.querySelector('#login-form');
const logoutButton = document.querySelector('#logout-button');
const userEmailDisplay = document.querySelector('#user-email-display');
const authMessage = document.querySelector('#auth-message');
const tagsContainer = document.querySelector('#tags-container');
const detailsPage = document.querySelector('#details-page');
const statusContainer = document.querySelector('#status-container'); // NEW


// --- FUNCTIONS ---
function initializeMap() {
  if (isMapInitialized) return;
  map = L.map('map').setView([59.0, 25.5], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  allFarms.forEach(farm => {
    if (farm.latitude && farm.longitude) {
      const popupContent = `<b>${farm.name}</b><br>${farm.location}<br><br><button class="details-button-map" data-id="${farm.id}">View Details</button>`;
      L.marker([farm.latitude, farm.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    }
  });
  isMapInitialized = true;
}

function displayProductTags() {
    const allProducts = allFarms.flatMap(farm => farm.products || []);
    const uniqueProducts = [...new Set(allProducts)];
    uniqueProducts.sort();
    tagsContainer.innerHTML = '';
    uniqueProducts.forEach(product => {
        const tagElement = document.createElement('div');
        tagElement.classList.add('tag');
        tagElement.textContent = product;
        tagElement.addEventListener('click', () => {
            searchInput.value = product;
            searchInput.dispatchEvent(new Event('input'));
        });
        tagsContainer.appendChild(tagElement);
    });
}

function showDetailsPage(farmId) {
    const farm = allFarms.find(f => f.id === farmId);
    if (!farm) return;

    // NEW: Create HTML for the product tags
    let tagsHTML = '';
    if (farm.products && farm.products.length > 0) {
        tagsHTML = `
            <div class="card-tags-container" style="padding: 0; margin-top: 20px;">
                ${farm.products.map(product => `<div class="card-tag">${product}</div>`).join('')}
            </div>
        `;
    }

    // NEW: Create the Get Directions button if coordinates exist
    let directionsHTML = '';
    if (farm.latitude && farm.longitude) {
        // This creates a Google Maps directions URL
        const directionsURL = `https://www.google.com/maps/dir/?api=1&destination=${farm.latitude},${farm.longitude}`;
        directionsHTML = `<a href="${directionsURL}" target="_blank" class="details-button">Get Directions</a>`;
    }

    detailsPage.innerHTML = `
        <div class="details-header">
            <button class="back-button">&larr;</button>
            <img class="details-image" src="${farm.image || 'https://placehold.co/600x400?text=No+Image'}" alt="${farm.name}">
        </div>
        <div class="details-content">
            <h2>${farm.name}</h2>
            <p><strong>Location:</strong> ${farm.location}</p>
            <p>${farm.description || 'No description available.'}</p>
            ${tagsHTML}
            <div id="details-map-container" class="details-map-container"></div>
            ${directionsHTML}
        </div>
    `;

    showPage('details-page');
    
    if (farm.latitude && farm.longitude) {
        setTimeout(() => {
            if (detailsMap) detailsMap.remove();
            detailsMap = L.map('details-map-container').setView([farm.latitude, farm.longitude], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(detailsMap);
            L.marker([farm.latitude, farm.longitude]).addTo(detailsMap);
        }, 0);
    }
    
    detailsPage.querySelector('.back-button').addEventListener('click', () => {
        showPage('discover-page');
    });
}

function showPage(pageId) {
  document.querySelectorAll('.app-container > .page').forEach(p => p.style.display = 'none');
  const pageToShow = document.querySelector(`#${pageId}`);
  if (pageToShow) pageToShow.style.display = 'block';
  const mainPages = ['discover-page', 'map-page', 'favorites-page', 'profile-page'];
  if (mainPages.includes(pageId)) {
      navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.dataset.page === pageId) link.classList.add('active');
      });
  }
  if (pageId === 'map-page') setTimeout(initializeMap, 0);
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function displayFarms(farmsToDisplay, userCoords = null) {
  farmListContainer.innerHTML = '';
  if (!farmsToDisplay || farmsToDisplay.length === 0) {
    farmListContainer.innerHTML = '<p style="padding: 20px;">No farms found.</p>';
    return;
  }
  
  if (userCoords) {
      farmsToDisplay.forEach(farm => {
          if (farm.latitude && farm.longitude) {
              farm.distance = getDistance(userCoords.latitude, userCoords.longitude, farm.latitude, farm.longitude);
          } else {
              farm.distance = Infinity;
          }
      });
      farmsToDisplay.sort((a, b) => a.distance - b.distance);
  }

  farmsToDisplay.forEach(farm => {
    const imageHTML = farm.image ? `<img src="${farm.image}" alt="A scenic view of ${farm.name}">` : '';
    let tagsHTML = '';
    if (farm.products && farm.products.length > 0) {
        tagsHTML = `<div class="card-tags-container">${farm.products.map(product => `<div class="card-tag">${product}</div>`).join('')}</div>`;
    }
    const distanceText = farm.distance && farm.distance !== Infinity 
      ? `Approx. ${Math.round(farm.distance)} km away` 
      : '';

    const farmCardHTML = `
      <div class="farm-card">
        ${imageHTML}
        <div class="card-content">
            <h3>${farm.name}</h3>
            <p class="farm-distance">${distanceText}</p>
            <p class="description">${farm.description || 'No description available.'}</p>
            ${tagsHTML}
            <button class="details-button" data-id="${farm.id}">View Details</button>
        </div>
      </div>
    `;
    farmListContainer.innerHTML += farmCardHTML;
  });
}

// UPDATED: Now includes loading and error handling
async function fetchAndDisplayFarms() {
  // 1. Show the loading spinner and make the container visible
  statusContainer.style.display = 'flex';
  statusContainer.innerHTML = '<div class="loader"></div>';
  farmListContainer.innerHTML = '';

  const { data, error } = await supabaseClient.from('farms').select('*');
  
  if (error) {
    // 2. If there's an error, show an error message
    console.error('Error fetching farms:', error);
    statusContainer.innerHTML = '<p class="error-message">Could not load farms. Please try again later.</p>';
  } else {
    // 3. On success, hide the status container completely
    statusContainer.style.display = 'none';
    
    allFarms = data;
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userCoords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            displayFarms(allFarms, userCoords);
        }, () => {
            displayFarms(allFarms);
        });
    } else {
        displayFarms(allFarms);
    }
    displayProductTags();
  }
}

// --- EVENT LISTENERS ---
document.querySelector('#map').addEventListener('click', (event) => {
    if (event.target.classList.contains('details-button-map')) {
        const farmId = parseInt(event.target.dataset.id, 10);
        showDetailsPage(farmId);
    }
});
farmListContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('details-button')) {
        const farmId = parseInt(event.target.dataset.id, 10);
        showDetailsPage(farmId);
    }
});
searchInput.addEventListener('input', (event) => {
  const searchTerm = event.target.value.toLowerCase();
  farmsHeading.textContent = searchTerm ? `Results for "${searchTerm}"` : 'All Farms';
  const userCoords = null; // We lose user coords on search, can be improved later
  const filteredFarms = allFarms.filter(farm => {
    const inName = farm.name ? farm.name.toLowerCase().includes(searchTerm) : false;
    const inDesc = farm.description ? farm.description.toLowerCase().includes(searchTerm) : false;
    const inLoc = farm.location ? farm.location.toLowerCase().includes(searchTerm) : false;
    const inProd = farm.products ? farm.products.join(' ').toLowerCase().includes(searchTerm) : false;
    return inName || inDesc || inLoc || inProd;
  });
  displayFarms(filteredFarms, userCoords);
});
navLinks.forEach(link => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    showPage(link.dataset.page);
  });
});
signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.querySelector('#signup-email').value;
  const password = document.querySelector('#signup-password').value;
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    authMessage.textContent = error.message;
  } else {
    authMessage.textContent = 'Sign up successful! You are now logged in.';
  }
});
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.querySelector('#login-email').value;
  const password = document.querySelector('#login-password').value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    authMessage.textContent = error.message;
  } else {
    authMessage.textContent = 'Login successful!';
  }
});
logoutButton.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  authMessage.textContent = 'You have been logged out.';
});

// --- AUTH STATE MANAGEMENT ---
supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) {
    authContainer.style.display = 'none';
    profileDetailsContainer.style.display = 'block';
    userEmailDisplay.textContent = `Welcome, ${session.user.email}`;
  } else {
    authContainer.style.display = 'block';
    profileDetailsContainer.style.display = 'none';
  }
});

// --- INITIAL LOAD ---
showPage('discover-page');
fetchAndDisplayFarms();