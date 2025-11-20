// Konfigurasi
const API_KEY = '1951eaf83ea012a56d971c1fc755b7a8'; // Ganti dengan API Key OpenWeatherMap Anda
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Elemen DOM
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const weatherInfo = document.getElementById('weather-info');
const errorMessage = document.getElementById('error-message');
const loading = document.getElementById('loading');
const historyList = document.getElementById('history-list');
const searchHistory = document.getElementById('search-history');

// State
let searchTimeout;
const HISTORY_MAX_ITEMS = 5;

// Inisialisasi
document.addEventListener('DOMContentLoaded', function() {
    loadSearchHistory();
    getLocationWeather(); // Auto-detect location on load
});

// Event Listeners dengan Debounce
searchBtn.addEventListener('click', handleSearch);
locationBtn.addEventListener('click', getLocationWeather);

cityInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (this.value.trim().length >= 3) {
            handleSearch();
        }
    }, 800);
});

cityInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// Fungsi utama pencarian
async function handleSearch() {
    const city = cityInput.value.trim();
    
    if (!city) {
        showError('Silakan masukkan nama kota');
        return;
    }
    
    await getWeatherData(city);
}

// Ambil data cuaca dari API
async function getWeatherData(city) {
    showLoading();
    hideError();
    
    try {
        const url = `${BASE_URL}?q=${city}&appid=${API_KEY}&units=metric&lang=id`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Kota tidak ditemukan');
        }
        
        const data = await response.json();
        displayWeatherData(data);
        addToSearchHistory(city);
        
    } catch (error) {
        console.error('Error:', error);
        showError(`Error: ${error.message}`);
    }
}

// Tampilkan data cuaca
function displayWeatherData(data) {
    const {
        name: cityName,
        sys: { country },
        main: { temp, feels_like, humidity, pressure },
        weather: [{ description, icon, main }],
        wind: { speed: windSpeed },
        visibility,
        dt
    } = data;

    const iconUrl = `https://openweathermap.org/img/wn/${icon}@4x.png`;
    const currentDate = new Date(dt * 1000).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const currentTime = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const weatherHTML = `
        <div class="weather-card">
            <div class="city-name">
                <i class="fas fa-map-marker-alt"></i>
                ${cityName}, ${country}
            </div>
            <div class="date-time">
                ${currentDate} • ${currentTime}
            </div>
            
            <div class="weather-main">
                <div class="temperature">${Math.round(temp)}°C</div>
                <img src="${iconUrl}" alt="${description}" class="weather-icon">
            </div>
            
            <div class="weather-description">${description}</div>
            
            <div class="weather-details">
                <div class="detail-card">
                    <div class="detail-icon">🌡️</div>
                    <div class="detail-label">Terasa seperti</div>
                    <div class="detail-value">${Math.round(feels_like)}°C</div>
                </div>
                
                <div class="detail-card">
                    <div class="detail-icon">💧</div>
                    <div class="detail-label">Kelembapan</div>
                    <div class="detail-value">${humidity}%</div>
                </div>
                
                <div class="detail-card">
                    <div class="detail-icon">💨</div>
                    <div class="detail-label">Angin</div>
                    <div class="detail-value">${windSpeed} m/s</div>
                </div>
                
                <div class="detail-card">
                    <div class="detail-icon">🔍</div>
                    <div class="detail-label">Tekanan</div>
                    <div class="detail-value">${pressure} hPa</div>
                </div>
            </div>
        </div>
    `;

    weatherInfo.innerHTML = weatherHTML;
    weatherInfo.style.display = 'block';
    hideLoading();
    
    // Update background berdasarkan kondisi cuaca
    updateBackground(main);
}

// Geolocation
function getLocationWeather() {
    if (!navigator.geolocation) {
        showError('Geolocation tidak didukung di browser ini');
        return;
    }

    showLoading();
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
                const url = `${BASE_URL}?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=id`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error('Gagal mendapatkan data lokasi');
                }
                
                const data = await response.json();
                displayWeatherData(data);
                cityInput.value = data.name;
                addToSearchHistory(data.name);
                
            } catch (error) {
                showError(`Error: ${error.message}`);
            }
        },
        (error) => {
            hideLoading();
            let errorMessage = 'Gagal mendapatkan lokasi: ';
            
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Izin lokasi ditolak';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Informasi lokasi tidak tersedia';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Permintaan lokasi timeout';
                    break;
                default:
                    errorMessage += 'Error tidak diketahui';
            }
            
            showError(errorMessage);
        },
        {
            timeout: 10000,
            enableHighAccuracy: true
        }
    );
}

// Search History dengan localStorage
function addToSearchHistory(city) {
    let history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
    
    // Hapus jika sudah ada
    history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
    
    // Tambahkan di depan
    history.unshift(city);
    
    // Batasi jumlah item
    if (history.length > HISTORY_MAX_ITEMS) {
        history = history.slice(0, HISTORY_MAX_ITEMS);
    }
    
    localStorage.setItem('weatherSearchHistory', JSON.stringify(history));
    loadSearchHistory();
}

function loadSearchHistory() {
    const history = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
    
    if (history.length === 0) {
        searchHistory.style.display = 'none';
        return;
    }
    
    searchHistory.style.display = 'block';
    historyList.innerHTML = history.map(city => `
        <div class="history-item" onclick="searchFromHistory('${city}')">
            ${city}
        </div>
    `).join('');
}

function searchFromHistory(city) {
    cityInput.value = city;
    getWeatherData(city);
}

function clearSearchHistory() {
    localStorage.removeItem('weatherSearchHistory');
    loadSearchHistory();
}

// Update background berdasarkan cuaca
function updateBackground(weatherCondition) {
    const body = document.body;
    const backgroundAnimation = document.querySelector('.background-animation');
    
    // Hapus class cuaca sebelumnya
    body.className = body.className.replace(/weather-.*?(\s|$)/g, '');
    backgroundAnimation.className = 'background-animation';
    
    // Tambah class cuaca baru
    let bgClass = '';
    let animationClass = '';
    
    switch (weatherCondition.toLowerCase()) {
        case 'clear':
            bgClass = 'weather-clear';
            animationClass = 'sunny';
            break;
        case 'clouds':
            bgClass = 'weather-clouds';
            animationClass = 'cloudy';
            break;
        case 'rain':
        case 'drizzle':
            bgClass = 'weather-rain';
            animationClass = 'rainy';
            break;
        case 'thunderstorm':
            bgClass = 'weather-thunderstorm';
            animationClass = 'stormy';
            break;
        case 'snow':
            bgClass = 'weather-snow';
            animationClass = 'snowy';
            break;
        default:
            bgClass = 'weather-default';
            animationClass = 'default';
    }
    
    body.classList.add(bgClass);
    backgroundAnimation.classList.add(animationClass);
}

// Utility Functions
function showLoading() {
    loading.style.display = 'block';
    weatherInfo.style.display = 'none';
    hideError();
}

function hideLoading() {
    loading.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    weatherInfo.style.display = 'none';
    hideLoading();
}

function hideError() {
    errorMessage.style.display = 'none';
}

// CSS tambahan untuk kondisi cuaca (tambahkan di style.css)
const additionalCSS = `
/* Weather Condition Backgrounds */
.weather-clear {
    background: linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%);
}

.weather-clouds {
    background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
}

.weather-rain {
    background: linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%);
}

.weather-thunderstorm {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.weather-snow {
    background: linear-gradient(135deg, #e6e9f0 0%, #eef1f5 100%);
}

.weather-default {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Animation Classes */
.sunny .sun {
    animation: pulse 3s infinite alternate;
}

.cloudy .cloud {
    animation: float 15s infinite linear;
}

.rainy::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(transparent 80%, rgba(255,255,255,0.3) 100%);
    animation: rain 1s linear infinite;
    pointer-events: none;
}

@keyframes rain {
    0% { background-position: 0% 0%; }
    100% { background-position: 0% 100%; }
}
`;

// Tambahkan CSS dinamis
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);