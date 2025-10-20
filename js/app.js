// Initialize Leaflet map
const map = L.map('map').setView([32.2226, -110.9747], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add markers for existing shade structures (example)
const existingShade = [
  { name: "Reid Park", coords: [32.214, -110.918] },
  { name: "University of Arizona Mall", coords: [32.232, -110.955] },
  { name: "4th Avenue Underpass", coords: [32.223, -110.969] }
];

existingShade.forEach(s => {
  L.marker(s.coords).addTo(map)
    .bindPopup(`<b>${s.name}</b><br>Existing Shade Area`);
});

// Add shade proposal button interaction
document.getElementById("addShadeBtn").addEventListener("click", () => {
  alert("Click a spot on the map to propose new shade!");
  map.once('click', (e) => {
    const marker = L.marker(e.latlng).addTo(map)
      .bindPopup("🌳 Proposed Shade Site<br>Lat: " + e.latlng.lat.toFixed(4) + "<br>Lng: " + e.latlng.lng.toFixed(4))
      .openPopup();
  });
});

// Chart.js - simple stats
const ctx = document.getElementById('shadeChart').getContext('2d');
new Chart(ctx, {
  type: 'doughnut',
  data: {
    labels: ['Existing Shade', 'Proposed Shade'],
    datasets: [{
      data: [60, 40],
      backgroundColor: ['#3c91e6', '#f4d03f'],
      borderWidth: 1
    }]
  },
  options: {
    plugins: { legend: { position: 'bottom' } }
  }
});
