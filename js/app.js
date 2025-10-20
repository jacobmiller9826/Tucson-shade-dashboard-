var map = L.map('map').setView([32.2226, -110.9747], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

var proposalMarker = null;

// Click to place proposal marker
map.on('click', function(e){
  if(proposalMarker) map.removeLayer(proposalMarker);
  proposalMarker = L.marker(e.latlng).addTo(map);
  document.getElementById('shadeForm').dataset.lat = e.latlng.lat;
  document.getElementById('shadeForm').dataset.lng = e.latlng.lng;
});

// Load GeoJSON layers
Promise.all([
  fetch('data/trees.geojson').then(r => r.json()),
  fetch('data/structures.geojson').then(r => r.json()),
  fetch('data/heatzones.geojson').then(r => r.json())
]).then(([trees, structures, heatzones]) => {

  // Trees
  L.geoJSON(trees, {
    pointToLayer: (f, latlng) => L.circleMarker(latlng, {color:'green', radius:5}),
    onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.name}</b><br>${f.properties.description}`)
  }).addTo(map);
  document.getElementById('totalTrees').innerText = trees.features.length;

  // Shade Structures
  L.geoJSON(structures, {
    pointToLayer: (f, latlng) => L.marker(latlng),
    onEachFeature: (f, l) => l.bindPopup(`<b>${f.properties.name}</b><br>${f.properties.description}`)
  }).addTo(map);
  document.getElementById('totalStructures').innerText = structures.features.length;

  // Heat zones
  L.geoJSON(heatzones, {
    style: {color:'red', fillOpacity:0.2}
  }).addTo(map);
  document.getElementById('totalHeatZones').innerText = heatzones.features.length;
});

// Form submission
document.getElementById('shadeForm').addEventListener('submit', function(e){
  e.preventDefault();
  const name = document.getElementById('name').value;
  const desc = document.getElementById('desc').value;
  const lat = this.dataset.lat;
  const lng = this.dataset.lng;

  if(!lat || !lng){
    alert("Please click on the map to choose a location.");
    return;
  }

  alert(`Proposal Submitted!\nName: ${name}\nDescription: ${desc}\nLocation: ${lat}, ${lng}`);
  this.reset();
  if(proposalMarker) proposalMarker.remove();
  proposalMarker = null;
});
