// Hawker Open or Not
// This file controls the whole interactive experience:
// 1. Load official Data.gov.sg hawker closure data.
// 2. Convert raw API records into cleaner JavaScript objects.
// 3. Render search results, filters, details, favourites, and demo-date status.

const DATASET_ID = "d_bda4baa634dd1cc7a6c7cad5f19e2d68";
const API_URL = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=500`;
const FAVOURITES_KEY = "hawker-open-or-not-favourites";
const LARGE_TEXT_KEY = "hawker-open-or-not-large-text";
const SOON_DAYS = 14;
const FALLBACK_IMAGE_URL = "https://www.nea.gov.sg/images/default-source/hawker-centres-division/amoy-street-food-centre.jpg";

// Small sample used only when the live API cannot be reached.
// This keeps the app usable during presentation or offline testing.
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
  dateInput: document.querySelector("#dateInput"),
  resetDateButton: document.querySelector("#resetDateButton"),
  largeTextToggle: document.querySelector("#largeTextToggle"),
  retryButton: document.querySelector("#retryButton"),
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
  rawRecords: [],
  hawkers: [],
  selectedId: null,
  filter: "all",
  query: "",
  isLoading: true,
  dataSource: "api",
  viewDate: startOfDay(new Date()),
  favourites: loadFavourites(),
  largeText: localStorage.getItem(LARGE_TEXT_KEY) === "true"
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  elements.dateInput.value = toDateInputValue(state.viewDate);
  elements.largeTextToggle.checked = state.largeText;
  document.body.classList.toggle("large-text", state.largeText);

  bindEvents();
  renderLoading();
  await loadData();
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

  elements.dateInput.addEventListener("change", () => {
    const nextDate = parseDateInput(elements.dateInput.value);
    if (!nextDate) {
      showNotice("Please choose a valid date.", "warning");
      return;
    }

    state.viewDate = nextDate;
    rebuildHawkers();
    showNotice(`Showing hawker centre status for ${formatDate(state.viewDate)}.`, "success");
    render();
  });

  elements.resetDateButton.addEventListener("click", () => {
    state.viewDate = startOfDay(new Date());
    elements.dateInput.value = toDateInputValue(state.viewDate);
    rebuildHawkers();
    showNotice("Date reset to today.", "success");
    render();
  });

  elements.largeTextToggle.addEventListener("change", () => {
    state.largeText = elements.largeTextToggle.checked;
    document.body.classList.toggle("large-text", state.largeText);
    localStorage.setItem(LARGE_TEXT_KEY, String(state.largeText));
  });

  elements.retryButton.addEventListener("click", async () => {
    renderLoading();
    await loadData();
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
  state.isLoading = true;
  elements.retryButton.disabled = true;

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

    state.rawRecords = records;
    state.dataSource = "api";
    showNotice(`Loaded ${records.length} hawker centres from Data.gov.sg.`, "success");
  } catch (error) {
    state.rawRecords = fallbackRecords;
    state.dataSource = "fallback";
    showNotice("Live data could not be loaded, so sample hawker centre data is shown for testing.", "warning");
  } finally {
    state.isLoading = false;
    elements.retryButton.disabled = false;
    rebuildHawkers();
    render();
  }
}

function rebuildHawkers() {
  state.hawkers = state.rawRecords.map(normaliseHawker);

  if (!state.hawkers.some((hawker) => hawker.id === state.selectedId)) {
    state.selectedId = null;
  }
}

// Data.gov.sg records have many field names from the original dataset.
// This function turns each record into a simpler object that the UI can use.
function normaliseHawker(record) {
  const closures = [
    buildClosure(record.q1_cleaningstartdate, record.q1_cleaningenddate, record.remarks_q1, "Q1 cleaning"),
    buildClosure(record.q2_cleaningstartdate, record.q2_cleaningenddate, record.remarks_q2, "Q2 cleaning"),
    buildClosure(record.q3_cleaningstartdate, record.q3_cleaningenddate, record.remarks_q3, "Q3 cleaning"),
    buildClosure(record.q4_cleaningstartdate, record.q4_cleaningenddate, record.remarks_q4, "Q4 cleaning"),
    buildClosure(record.other_works_startdate, record.other_works_enddate, record.remarks_other_works, "Other works")
  ].filter(Boolean);

  closures.sort((a, b) => a.start - b.start);

  const nextClosure = closures.find((closure) => closure.end >= state.viewDate) || null;
  const isClosed = closures.some((closure) => state.viewDate >= closure.start && state.viewDate <= closure.end);
  const closingSoon = Boolean(nextClosure && !isClosed && daysBetween(state.viewDate, nextClosure.start) <= SOON_DAYS);

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

function renderLoading() {
  state.isLoading = true;
  elements.todayDate.textContent = formatDate(state.viewDate);
  elements.resultSummary.textContent = "Loading hawker centre data...";
  elements.resultsGrid.innerHTML = `
    <article class="card skeleton-card">
      <div class="skeleton-line wide"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </article>
    <article class="card skeleton-card">
      <div class="skeleton-line wide"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </article>
  `;
}

function render() {
  if (state.isLoading) {
    return;
  }

  const filtered = getVisibleHawkers();
  elements.todayDate.textContent = formatDate(state.viewDate);
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
  const sourceLabel = state.dataSource === "api" ? "live API" : "sample data";
  elements.resultSummary.textContent = `${hawkers.length} hawker centre${hawkers.length === 1 ? "" : "s"} shown using ${sourceLabel}`;

  if (hawkers.length === 0) {
    elements.resultsGrid.innerHTML = `
      <article class="card empty-card">
        <h2>No hawker centres found</h2>
        <p class="meta">Try another search term, choose another date, or switch back to the All filter.</p>
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
        <span>${escapeHtml(getNextClosureText(hawker))}</span>
        <span>${hawker.foodStalls} food stalls / ${hawker.marketStalls} market stalls</span>
      </p>
      <div class="card-actions">
        <button type="button" class="primary" data-select-id="${escapeAttribute(hawker.id)}">View details</button>
        <button type="button" data-favourite-id="${escapeAttribute(hawker.id)}">
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
  const photoUrl = getSafeUrl(hawker.photoUrl) || FALLBACK_IMAGE_URL;

  elements.detailsPanel.innerHTML = `
    <img class="details-image" src="${photoUrl}" alt="${escapeAttribute(hawker.name)}" loading="lazy">
    <div class="details-content">
      <div class="details-title-row">
        <span class="badge ${hawker.status}">${getStatusLabel(hawker)}</span>
        <h2>${escapeHtml(hawker.name)}</h2>
        <p class="meta">${escapeHtml(hawker.address || "Address unavailable")}</p>
      </div>

      <p class="status-note">${escapeHtml(getStatusExplanation(hawker))}</p>

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
        <h2>Cleaning closure dates</h2>
        <ul class="date-list">
          ${renderClosureDates(hawker)}
        </ul>
      </section>

      <section>
        <h2>About this centre</h2>
        <p class="meta">${escapeHtml(hawker.description || "No description available from the dataset.")}</p>
      </section>

      <section>
        <h2>Nearby open alternatives</h2>
        <ul class="alt-list">
          ${renderAlternatives(alternatives)}
        </ul>
      </section>
    </div>
  `;

  const image = elements.detailsPanel.querySelector(".details-image");
  image.addEventListener("error", () => {
    image.src = FALLBACK_IMAGE_URL;
  }, { once: true });

  document.querySelector("#detailFavouriteButton").addEventListener("click", () => toggleFavourite(hawker.id));
}

function renderClosureDates(hawker) {
  if (hawker.closures.length === 0) {
    return `<li class="date-item"><strong>No dates listed</strong><span>Data.gov.sg has no cleaning dates for this centre.</span></li>`;
  }

  return hawker.closures.map((closure) => `
    <li class="date-item ${isActiveClosure(closure) ? "active-date" : ""}">
      <strong>${closure.label}: ${formatDateRange(closure.start, closure.end)}</strong>
      <span>${getClosureState(closure)}${closure.remarks ? ` / ${escapeHtml(closure.remarks)}` : ""}</span>
    </li>
  `).join("");
}

function renderAlternatives(alternatives) {
  if (alternatives.length === 0) {
    return `<li>No nearby open alternatives found in the current dataset.</li>`;
  }

  return alternatives.map((item) => `
    <li>
      <strong>${escapeHtml(item.name)}</strong>
      <span class="meta">${item.distance.toFixed(1)} km away / ${getStatusLabel(item)}</span>
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
  const hawker = state.hawkers.find((item) => item.id === id);

  if (state.favourites.includes(id)) {
    state.favourites = state.favourites.filter((item) => item !== id);
    showNotice(`${hawker?.name || "Hawker centre"} removed from favourites.`, "success");
  } else {
    state.favourites = [...state.favourites, id];
    showNotice(`${hawker?.name || "Hawker centre"} saved to favourites.`, "success");
  }

  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(state.favourites));
  render();
}

// Haversine formula: calculates straight-line distance between two coordinates.
// It is enough for suggesting nearby alternatives without a full maps API.
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

function parseDateInput(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return startOfDay(new Date(year, month - 1, day));
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

function getStatusExplanation(hawker) {
  if (hawker.status === "closed") {
    return `This centre is listed as closed for cleaning on ${formatDate(state.viewDate)}.`;
  }

  if (hawker.status === "soon") {
    return `This centre is open on ${formatDate(state.viewDate)}, but its next cleaning closure is within ${SOON_DAYS} days.`;
  }

  return `This centre is not listed as closed on ${formatDate(state.viewDate)}.`;
}

function getNextClosureText(hawker) {
  if (!hawker.nextClosure) {
    return "No upcoming closure listed";
  }

  return `Next closure: ${formatDateRange(hawker.nextClosure.start, hawker.nextClosure.end)}`;
}

function getClosureState(closure) {
  if (isActiveClosure(closure)) {
    return "Happening on selected date";
  }

  if (closure.end < state.viewDate) {
    return "Completed";
  }

  return `Starts in ${daysBetween(state.viewDate, closure.start)} day${daysBetween(state.viewDate, closure.start) === 1 ? "" : "s"}`;
}

function isActiveClosure(closure) {
  return state.viewDate >= closure.start && state.viewDate <= closure.end;
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
    return FALLBACK_IMAGE_URL;
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

// The API is trusted public data, but escaping text before rendering is still
// good practice because it prevents accidental HTML injection.
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
    const saved = JSON.parse(localStorage.getItem(FAVOURITES_KEY));
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
