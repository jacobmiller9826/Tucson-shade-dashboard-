// main.js - static front-end map logic
// Note: works fully static. Proposals saved in localStorage.

// --- Config / initial variables ---
const CENTER = [32.2226, -110.9747]; // Tucson center
const START_ZOOM = 12;

// DOM refs
const totalTreesEl = document.getElementById('totalTrees');
const totalStructuresEl = document.getElementById('totalStructures');
const totalProposedEl = document.getElementById('totalProposed');

const toggleTrees = document.getElementById('toggleTrees');
const toggleStructures = document.getElementById('toggleStructures');
const toggleHeat = document.getElementById('toggleHeat');
const toggleProposed = document.getElementById('toggleProposed');

const btnAddShade = document.getElementById('btnAddShade');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const cancelProposal = document.getElementById('cancelProposal');
const proposalForm = document.getElementById('proposalForm');
const metaLat = document.getElementById('metaLat');
const metaLng = document.getElementById('metaLng');
const pName = document.getElementById('pName');
const pType = document.getElementById('pType');
const pDesc = document.getElementById('pDesc');

// Map and layers
const map = L.map('map', { zoomControl: true }).setView(CENTER, START_ZOOM);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let treesLayer = L.layerGroup().addTo(map);
let structuresLayer = L.layerGroup().addTo(map);
let heatLayer = L.layerGroup().addTo(map);
let proposedLayer = L.layerGroup().addTo(map);

let currentProposalMarker = null;
let addMode = false; // when true, next map click places marker for proposal

// --- Load static data files (GeoJSON in /data) ---
async function loadGeoJSON(path){
  try{
    const r = await fetch(path);
    if(!r.ok) throw new Error('Failed loading ' + path);
    return await r.json();
  }catch(e){
    console.warn(e);
    return { type: 'FeatureCollection', features: [] };
  }
}

async function initData(){
  const [trees, structures, heatZones] = await Promise.all([
    loadGeoJSON('data/shade_existing.geojson'),
    loadGeoJSON('data/shade_structures.geojson').catch(()=>({type:'FeatureCollection',features:[] })),
    loadGeoJSON('data/heatzones.geojson').catch(()=>({type:'FeatureCollection',features:[] }))
  ]);

  // Trees
  L.geoJSON(trees, {
    pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius:5, color:'#2a9d5a', weight:1.2, fillOpacity:0.9 }),
    onEachFeature: (f, l) => l.bindPopup(`<strong>${f.properties?.name||'Tree'}</strong><br>${f.properties?.description||''}`)
  }).addTo(treesLayer);
  totalTreesEl.textContent = trees.features.length;

  // Structures
  L.geoJSON(structures, {
    pointToLayer: (f, latlng) => L.marker(latlng),
    onEachFeature: (f, l) => l.bindPopup(`<strong>${f.properties?.name||'Shade structure'}</strong><br>${f.properties?.description||''}`)
  }).addTo(structuresLayer);
  totalStructuresEl.textContent = structures.features.length;

  // Heat zones (polygons)
  L.geoJSON(heatZones, {
    style: () => ({ color: '#ff6b6b', weight:1, fillOpacity:0.12 })
  }).addTo(heatLayer);

  // Load proposals from localStorage
  loadProposals();
  updateMiniChart();
}

// --- Proposals: localStorage ---
function saveProposals(proposals){
  localStorage.setItem('tucson_shade_proposals_v1', JSON.stringify(proposals));
}

function loadProposals(){
  const raw = localStorage.getItem('tucson_shade_proposals_v1');
  let arr = [];
  if(raw){
    try { arr = JSON.parse(raw); } catch(e){ arr = []; }
  }
  // Add to map
  proposedLayer.clearLayers();
  arr.forEach(p => {
    const m = L.marker([p.lat,p.lng], { title: p.name, riseOnHover:true }).addTo(proposedLayer);
    m.bindPopup(`<strong>${p.name}</strong><br><em>${p.type}</em><br>${p.desc}`);
  });
  totalProposedEl.textContent = arr.length;
  updateMiniChart(arr);
}

function addProposalToStore(p){
  const raw = localStorage.getItem('tucson_shade_proposals_v1');
  let arr = raw ? JSON.parse(raw) : [];
  arr.unshift(p);
  saveProposals(arr);
  loadProposals();
}

// --- UI: Add mode & modal handling ---
btnAddShade.addEventListener('click', () => {
  addMode = true;
  btnAddShade.textContent = 'Click map to place';
  btnAddShade.classList.add('active');
  alert('Click the map to place your proposal pin.\n(You can cancel by pressing Esc or the Cancel button.)');
});

map.on('click', (e) => {
  if(!addMode) return;
  // remove old marker
  if(currentProposalMarker) map.removeLayer(currentProposalMarker);
  currentProposalMarker = L.marker(e.latlng, { draggable:true }).addTo(map);
  metaLat.textContent = e.latlng.lat.toFixed(6);
  metaLng.textContent = e.latlng.lng.toFixed(6);
  // open modal
  showModal(e.latlng.lat, e.latlng.lng);
});

function showModal(lat, lng){
  modal.classList.remove('hidden');
  pName.focus();
  // set meta
  metaLat.textContent = Number(lat).toFixed(6);
  metaLng.textContent = Number(lng).toFixed(6);
}

function hideModal(){
  modal.classList.add('hidden');
  addMode = false;
  btnAddShade.textContent = '+ Add Shade';
  btnAddShade.classList.remove('active');
  if(currentProposalMarker){ map.removeLayer(currentProposalMarker); currentProposalMarker = null; }
}

modalClose.addEventListener('click', hideModal);
cancelProposal.addEventListener('click', (ev) => { ev.preventDefault(); hideModal(); });
window.addEventListener('keydown', (e)=> { if(e.key === 'Escape') hideModal(); });

// Submit proposal
proposalForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const lat = parseFloat(metaLat.textContent);
  const lng = parseFloat(metaLng.textContent);
  if(Number.isNaN(lat) || Number.isNaN(lng)) { alert('Missing location'); return; }

  const proposal = {
    id: 'p_' + Date.now(),
    name: pName.value.trim(),
    type: pType.value,
    desc: pDesc.value.trim(),
    lat, lng,
    created: new Date().toISOString()
  };

  // add to map immediately
  const m = L.marker([lat,lng]).addTo(proposedLayer);
  m.bindPopup(`<strong>${proposal.name}</strong><br><em>${proposal.type}</em><br>${proposal.desc}`);

  // store
  addProposalToStore(proposal);

  // reset UI
  proposalForm.reset();
  hideModal();
  updateMiniChart();
});

// --- Layer toggles ---
toggleTrees.addEventListener('change', (e) => {
  if(e.target.checked) map.addLayer(treesLayer); else map.removeLayer(treesLayer);
});
toggleStructures.addEventListener('change', (e) => {
  if(e.target.checked) map.addLayer(structuresLayer); else map.removeLayer(structuresLayer);
});
toggleHeat.addEventListener('change', (e) => {
  if(e.target.checked) map.addLayer(heatLayer); else map.removeLayer(heatLayer);
});
toggleProposed.addEventListener('change', (e) => {
  if(e.target.checked) map.addLayer(proposedLayer); else map.removeLayer(proposedLayer);
});

// --- Mini chart ---
let miniChart = null;
function updateMiniChart(proposalsArray){
  const existing = Number(totalTreesEl.textContent) || 0;
  const structures = Number(totalStructuresEl.textContent) || 0;
  const proposed = proposalsArray ? proposalsArray.length : (localStorage.getItem('tucson_shade_proposals_v1') ? JSON.parse(localStorage.getItem('tucson_shade_proposals_v1')).length : 0);

  totalProposedEl.textContent = proposed;

  const ctx = document.getElementById('miniChart').getContext('2d');
  if(miniChart) miniChart.destroy();
  miniChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Existing trees','Structures','Proposed'],
      datasets: [{
        data: [existing, structures, proposed || 1],
        backgroundColor: ['#2a9d5a', '#3C91E6', '#f4a261'],
        hoverOffset: 6
      }]
    },
    options: {
      plugins:{ legend:{ display:false } },
      cutout: '60%'
    }
  });
}

// Initialize
initData();
