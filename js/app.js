const DATASET_ID = "d_bda4baa634dd1cc7a6c7cad5f19e2d68";
const API_URL = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=500`;
const STORAGE_KEY = "hawker-open-or-not-favourites";
const SOON_DAYS = 14;

const fallbackRecords = [
  {
    _id: 1,
    name: "Adam Road Food Centre",
    q1_cleaningstartdate: "30/3/2026",
    q1_cleaningenddate: "31/3/2026",
    q2_cleaningstartdate: "8/6/2026",
    q2_cleaningenddate: "8/6/2026",
    q3_cleaningstartdate: "7/9/2026",
    q3_cleaningenddate: "7/9/2026",
    q4_cleaningstartdate: "7/12/2026",
    q4_cleaningenddate: "8/12/2026",
    other_works_startdate: "NA",
    other_works_enddate: "NA",
    latitude_hc: "1.324131966",
    longitude_hc: "103.8141632",
    photourl: "http://www.nea.gov.sg/images/default-source/Hawker-Centres-Division/resize_1267437914368.jpg",
    address_myenv: "2, Adam Road, Singapore 289876",
    no_of_market_stalls: "0",
    no_of_food_stalls: "32",
    description_myenv: "Built in 1974, Adam Food Centre comprises 32 cooked food stalls.",
    google_3d_view: "https://goo.gl/maps/ZMLJeP8STKpDP9so9"
  },
  {
    _id: 3,
    name: "Amoy Street Food Centre (Telok Ayer Food Centre)",
    q1_cleaningstartdate: "28/2/2026",
    q1_cleaningenddate: "28/2/2026",
    q2_cleaningstartdate: "30/5/2026",
    q2_cleaningenddate: "30/5/2026",
    q3_cleaningstartdate: "19/9/2026",
    q3_cleaningenddate: "19/9/2026",
    q4_cleaningstartdate: "5/12/2026",
    q4_cleaningenddate: "6/12/2026",
    other_works_startdate: "NA",
    other_works_enddate: "NA",
    latitude_hc: "1.279129028",
    longitude_hc: "103.8469849",
    photourl: "https://www.nea.gov.sg/images/default-source/hawker-centres-division/amoy-street-food-centre.jpg",
    address_myenv: "National Development Building, Annex B, Telok Ayer Street, Singapore 069111",
    no_of_market_stalls: "1",
    no_of_food_stalls: "134",
    description_myenv: "A two-storey food centre located within the central business district.",
    google_3d_view: "https://goo.gl/maps/RiX319zQXRFeHWPE6"
  }
];

const elements = {
  searchForm: document.querySelector("#searchForm"),
  searchInput: document.querySelector("#searchInput"),
  chips: document.querySelectorAll(".chip"),
  sortSelect: document.querySelector("#sortSelect"),
  resultsGrid: document.querySelector("#resultsGrid"),
  detailsPanel: document.querySelector("#detailsPanel"),
  resultSummary: document.querySelector("#resultSummary"),
  notice: document.querySelector("#notice"),
  todayDate: document.querySelector("#todayDate"),
  openCount: document.querySelector("#openCount"),
  soonCount: document.querySelector("#soonCount"),
  closedCount: document.querySelector("#closedCount")
};

const state = {
  hawkers: [],
  selectedId: null,
  filter: "all",
  query: "",
  favourites: loadFavourites()
};

const today = startOfDay(new Date());

document.addEventListener("DOMContentLoaded", init);

async function init() {
  elements.todayDate.textContent = formatDate(today);
  bindEvents();
  await loadData();
  render();
}

function bindEvents() {
  elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = elements.searchInput.value.trim().toLowerCase();
    render();
  });

  elements.searchInput.addEventListener("input", () => {
    state.query = elements.searchInput.value.trim().toLowerCase();
    render();
  });

  elements.chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      state.filter = chip.dataset.filter;
      elements.chips.forEach((item) => item.classList.toggle("active", item === chip));
      render();
    });
  });

  elements.sortSelect.addEventListener("change", render);
}

async function loadData() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error("The Data.gov.sg API did not respond successfully.");
    }

    const payload = await response.json();
    const records = payload?.result?.records;
    if (!Array.isArray(records)) {
      throw new Error("The Data.gov.sg response format was unexpected.");
    }

    state.hawkers = records.map(normaliseHawker);
    showNotice(`Loaded ${records.length} hawker centres from Data.gov.sg.`, "success");
  } catch (error) {
    state.hawkers = fallbackRecords.map(normaliseHawker);
    showNotice("Live data could not be loaded, so sample hawker centre data is shown for testing.", "warning");
  }
}

function normaliseHawker(record) {
  const closures = [
    buildClosure(record.q1_cleaningstartdate, record.q1_cleaningenddate, record.remarks_q1, "Q1 cleaning"),
    buildClosure(record.q2_cleaningstartdate, record.q2_cleaningenddate, record.remarks_q2, "Q2 cleaning"),
    buildClosure(record.q3_cleaningstartdate, record.q3_cleaningenddate, record.remarks_q3, "Q3 cleaning"),
    buildClosure(record.q4_cleaningstartdate, record.q4_cleaningenddate, record.remarks_q4, "Q4 cleaning"),
    buildClosure(record.other_works_startdate, record.other_works_enddate, record.remarks_other_works, "Other works")
  ].filter(Boolean);

  closures.sort((a, b) => a.start - b.start);

  const nextClosure = closures.find((closure) => closure.end >= today) || null;
  const isClosed = closures.some((closure) => today >= closure.start && today <= closure.end);
  const closingSoon = Boolean(nextClosure && !isClosed && daysBetween(today, nextClosure.start) <= SOON_DAYS);

  return {
    id: String(record._id || record.serial_no || record.name),
    name: cleanText(record.name),
    address: cleanText(record.address_myenv),
    description: cleanText(record.description_myenv),
    photoUrl: upgradeImageUrl(record.photourl),
    marketStalls: toNumber(record.no_of_market_stalls),
    foodStalls: toNumber(record.no_of_food_stalls),
    latitude: Number(record.latitude_hc),
    longitude: Number(record.longitude_hc),
    mapUrl: record.google_3d_view && record.google_3d_view !== "nil" ? record.google_3d_view : "",
    closures,
    nextClosure,
    status: isClosed ? "closed" : closingSoon ? "soon" : "open"
  };
}

function buildClosure(startValue, endValue, remarks, label) {
  const start = parseSingaporeDate(startValue);
  const end = parseSingaporeDate(endValue || startValue);

  if (!start || !end) {
    return null;
  }

  return {
    label,
    start,
    end,
    remarks: cleanText(remarks) === "nil" ? "" : cleanText(remarks)
  };
}

function render() {
  const filtered = getVisibleHawkers();
  updateStats();
  renderResults(filtered);
  renderDetails();
}

function getVisibleHawkers() {
  const query = state.query;
  const filter = state.filter;
  const sortMode = elements.sortSelect.value;

  return state.hawkers
    .filter((hawker) => {
      const matchesQuery = !query || `${hawker.name} ${hawker.address}`.toLowerCase().includes(query);
      const matchesFilter =
        filter === "all" ||
        hawker.status === filter ||
        (filter === "favourites" && state.favourites.includes(hawker.id));

      return matchesQuery && matchesFilter;
    })
    .sort((a, b) => {
      if (sortMode === "nextClosure") {
        return getTime(a.nextClosure?.start) - getTime(b.nextClosure?.start);
      }

      if (sortMode === "foodStalls") {
        return b.foodStalls - a.foodStalls;
      }

      return a.name.localeCompare(b.name);
    });
}

function renderResults(hawkers) {
  elements.resultSummary.textContent = `${hawkers.length} hawker centre${hawkers.length === 1 ? "" : "s"} shown`;

  if (hawkers.length === 0) {
    elements.resultsGrid.innerHTML = `
      <article class="card">
        <h2>No hawker centres found</h2>
        <p class="meta">Try another search term or switch back to the All filter.</p>
      </article>
    `;
    return;
  }

  elements.resultsGrid.innerHTML = hawkers.map((hawker) => `
    <article class="card ${state.selectedId === hawker.id ? "selected" : ""}">
      <div class="card-header">
        <h2>${escapeHtml(hawker.name)}</h2>
        <span class="badge ${hawker.status}">${getStatusLabel(hawker)}</span>
      </div>
      <p class="meta">
        <span>${escapeHtml(hawker.address || "Address unavailable")}</span>
        <span>${getNextClosureText(hawker)}</span>
        <span>${hawker.foodStalls} food stalls · ${hawker.marketStalls} market stalls</span>
      </p>
      <div class="card-actions">
        <button type="button" class="primary" data-select-id="${hawker.id}">View details</button>
        <button type="button" data-favourite-id="${hawker.id}">
          ${state.favourites.includes(hawker.id) ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  `).join("");

  elements.resultsGrid.querySelectorAll("[data-select-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.selectId;
      render();
    });
  });

  elements.resultsGrid.querySelectorAll("[data-favourite-id]").forEach((button) => {
    button.addEventListener("click", () => toggleFavourite(button.dataset.favouriteId));
  });
}

function renderDetails() {
  const hawker = state.hawkers.find((item) => item.id === state.selectedId);

  if (!hawker) {
    elements.detailsPanel.innerHTML = `
      <div class="empty-state">
        <h2>Pick a hawker centre</h2>
        <p>Choose any result to view cleaning dates, address, stall count, and nearby alternatives.</p>
      </div>
    `;
    return;
  }

  const alternatives = getNearbyAlternatives(hawker);
  const mapUrl = getSafeUrl(hawker.mapUrl) || `https://www.google.com/maps/search/?api=1&query=${hawker.latitude},${hawker.longitude}`;
  const photoUrl = getSafeUrl(hawker.photoUrl) || "https://www.nea.gov.sg/images/default-source/hawker-centres-division/amoy-street-food-centre.jpg";

  elements.detailsPanel.innerHTML = `
    <img class="details-image" src="${photoUrl}" alt="${escapeAttribute(hawker.name)}" loading="lazy">
    <div class="details-content">
      <div class="details-title-row">
        <span class="badge ${hawker.status}">${getStatusLabel(hawker)}</span>
        <h2>${escapeHtml(hawker.name)}</h2>
        <p class="meta">${escapeHtml(hawker.address)}</p>
      </div>

      <div class="details-actions">
        <a href="${mapUrl}" target="_blank" rel="noreferrer">Open map</a>
        <button type="button" id="detailFavouriteButton">
          ${state.favourites.includes(hawker.id) ? "Remove saved" : "Save favourite"}
        </button>
      </div>

      <div class="info-grid">
        <div>
          <span>Food stalls</span>
          <strong>${hawker.foodStalls}</strong>
        </div>
        <div>
          <span>Market stalls</span>
          <strong>${hawker.marketStalls}</strong>
        </div>
      </div>

      <section>
        <h2>Closure dates</h2>
        <ul class="date-list">
          ${renderClosureDates(hawker)}
        </ul>
      </section>

      <section>
        <h2>About this centre</h2>
        <p class="meta">${escapeHtml(hawker.description || "No description available from the dataset.")}</p>
      </section>

      <section>
        <h2>Nearby alternatives</h2>
        <ul class="alt-list">
          ${alternatives.map((item) => `
            <li>
              <strong>${escapeHtml(item.name)}</strong>
              <span class="meta">${item.distance.toFixed(1)} km away · ${getStatusLabel(item)}</span>
            </li>
          `).join("")}
        </ul>
      </section>
    </div>
  `;

  document.querySelector("#detailFavouriteButton").addEventListener("click", () => toggleFavourite(hawker.id));
}

function renderClosureDates(hawker) {
  if (hawker.closures.length === 0) {
    return `<li class="date-item"><strong>No dates listed</strong><span>Data.gov.sg has no cleaning dates for this centre.</span></li>`;
  }

  return hawker.closures.map((closure) => `
    <li class="date-item">
      <strong>${closure.label}: ${formatDateRange(closure.start, closure.end)}</strong>
      <span>${getClosureState(closure)}${closure.remarks ? ` · ${escapeHtml(closure.remarks)}` : ""}</span>
    </li>
  `).join("");
}

function updateStats() {
  const counts = state.hawkers.reduce((summary, hawker) => {
    summary[hawker.status] += 1;
    return summary;
  }, { open: 0, soon: 0, closed: 0 });

  elements.openCount.textContent = counts.open;
  elements.soonCount.textContent = counts.soon;
  elements.closedCount.textContent = counts.closed;
}

function toggleFavourite(id) {
  if (state.favourites.includes(id)) {
    state.favourites = state.favourites.filter((item) => item !== id);
  } else {
    state.favourites = [...state.favourites, id];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.favourites));
  render();
}

function getNearbyAlternatives(selected) {
  if (!Number.isFinite(selected.latitude) || !Number.isFinite(selected.longitude)) {
    return [];
  }

  return state.hawkers
    .filter((hawker) => hawker.id !== selected.id && hawker.status !== "closed")
    .map((hawker) => ({
      ...hawker,
      distance: getDistance(selected.latitude, selected.longitude, hawker.latitude, hawker.longitude)
    }))
    .filter((hawker) => Number.isFinite(hawker.distance))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
}

function parseSingaporeDate(value) {
  if (!value || ["NA", "nil", "TBC"].includes(String(value).trim())) {
    return null;
  }

  const parts = String(value).trim().split("/");
  if (parts.length !== 3) {
    return null;
  }

  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) {
    return null;
  }

  return startOfDay(new Date(year, month - 1, day));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date) {
  return date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatDateRange(start, end) {
  return start.getTime() === end.getTime() ? formatDate(start) : `${formatDate(start)} to ${formatDate(end)}`;
}

function daysBetween(start, end) {
  return Math.round((end - start) / 86400000);
}

function getTime(date) {
  return date ? date.getTime() : Number.POSITIVE_INFINITY;
}

function getStatusLabel(hawker) {
  if (hawker.status === "closed") {
    return "Closed today";
  }

  if (hawker.status === "soon") {
    return "Closing soon";
  }

  return "Open today";
}

function getNextClosureText(hawker) {
  if (!hawker.nextClosure) {
    return "No upcoming closure listed";
  }

  return `Next closure: ${formatDateRange(hawker.nextClosure.start, hawker.nextClosure.end)}`;
}

function getClosureState(closure) {
  if (today >= closure.start && today <= closure.end) {
    return "Happening today";
  }

  if (closure.end < today) {
    return "Completed";
  }

  return `Starts in ${daysBetween(today, closure.start)} day${daysBetween(today, closure.start) === 1 ? "" : "s"}`;
}

function cleanText(value) {
  return String(value || "").trim();
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function upgradeImageUrl(url) {
  const value = cleanText(url);
  if (!value || value === "nil") {
    return "https://www.nea.gov.sg/images/default-source/hawker-centres-division/amoy-street-food-centre.jpg";
  }

  return value.replace("http://", "https://");
}

function getSafeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch (error) {
    return "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function showNotice(message, type) {
  elements.notice.hidden = false;
  elements.notice.textContent = message;
  elements.notice.dataset.type = type;
}

function loadFavourites() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function getDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

function toRadians(value) {
  return value * Math.PI / 180;
}
