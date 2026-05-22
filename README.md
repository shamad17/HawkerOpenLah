# Hawker Open Lah

Hawker Open Lah is a Singapore-focused web application that helps users check whether a hawker centre is open, closing soon, or closed for cleaning.

The app uses official hawker centre cleaning closure data from Data.gov.sg and turns it into a simple, searchable interface. Instead of users manually reading a long government dataset, they can quickly search for a hawker centre, check its closure status for a selected date, save favourites, and find nearby open alternatives.

## Assignment Theme

Digital Inclusion / Daily Life Convenience

This project supports digital inclusion because public data can be difficult to read when it is shown as a raw dataset. Hawker Open Lah makes the data easier for everyday users such as students, working adults, elderly residents, families, and tourists. The app is especially useful for people who want to avoid wasted trips to hawker centres during scheduled cleaning closures.

## Problem Statement

Hawker centres are important everyday places in Singapore, but they sometimes close for cleaning. The closure information exists online, but it is not always convenient to search or understand quickly. A user may only want to know one simple thing: "Can I go there today?"

Hawker Open Lah solves this by showing clear status labels:

- Open today
- Closing soon
- Closed today

The app also allows users to choose a different date, which makes it useful for planning ahead and for demonstrating the project logic during presentation.

## Target Users

- Students planning meals near school
- Office workers choosing lunch spots
- Elderly residents who prefer familiar hawker centres
- Families planning meals
- Tourists or new residents learning about Singapore hawker centres

## Key Features

- Search hawker centres by name or address
- Filter by all centres, open today, closing soon, closed today, or favourites
- Select a demo/planning date to check closure status for any date
- View official cleaning closure dates from the dataset
- See address, photo, food stall count, market stall count, and description
- Save favourite hawker centres using `localStorage`
- Reload the live API data
- Open a hawker centre in Google Maps
- View nearby open alternatives using latitude and longitude
- Use icon buttons and strong typography to make actions easier to scan
- Use an original CSS logo mark to give the app a stronger visual identity
- Show loading, success, warning, empty, and fallback states
- Use fallback sample data if the live API cannot be loaded

## API Used

Dataset: Dates of Hawker Centres Closure  
Agency: National Environment Agency, via Data.gov.sg

API endpoint used:

```text
https://data.gov.sg/api/action/datastore_search?resource_id=d_bda4baa634dd1cc7a6c7cad5f19e2d68&limit=500
```

Dataset page:

```text
https://data.gov.sg/datasets/d_bda4baa634dd1cc7a6c7cad5f19e2d68/view
```

Important fields used from the API:

- `name`: hawker centre name
- `q1_cleaningstartdate` to `q4_cleaningstartdate`: quarterly cleaning start dates
- `q1_cleaningenddate` to `q4_cleaningenddate`: quarterly cleaning end dates
- `other_works_startdate` and `other_works_enddate`: extra closure dates
- `latitude_hc` and `longitude_hc`: location coordinates
- `photourl`: hawker centre image
- `address_myenv`: address
- `no_of_food_stalls`: number of food stalls
- `no_of_market_stalls`: number of market stalls
- `description_myenv`: hawker centre description
- `google_3d_view`: Google Maps link

## Code Implementation Explanation

### `index.html`

The HTML file defines the structure of the app:

- Header and hero section
- Search form
- Date selector
- Status summary cards
- Sort and reload controls
- Results grid
- Details panel
- Footer with Data.gov.sg credit

The JavaScript file is loaded using `defer`, so the HTML loads first before the script runs.

### `css/styles.css`

The CSS file controls the visual design and responsive layout:

- Uses CSS variables for consistent colours
- Creates the hero image background
- Styles cards, badges, buttons, filters, notices, and details panel
- Adds focus styles for keyboard accessibility
- Adds loading skeleton animation
- Adds responsive layouts for tablet and mobile screens
- Uses a refreshed colour palette and stronger typography
- Builds the hawker-style logo mark using HTML elements and CSS shapes

The design uses high-contrast status colours:

- Green for open
- Amber for closing soon
- Red for closed

### `js/app.js`

The JavaScript file controls the app logic.

Main parts of the script:

1. **Constants**

   Stores the API URL, dataset ID, localStorage keys, fallback image, and the number of days used for "closing soon".

2. **Fallback Data**

   Provides sample hawker centre records. This means the app still works during testing even if the live API is unavailable.

3. **State Object**

   Tracks important app data:

   - raw API records
   - cleaned hawker centre objects
   - selected hawker centre
   - search query
   - current filter
   - selected date
   - favourites
   - loading state

4. **API Loading**

   `loadData()` fetches the Data.gov.sg API. If successful, the app uses live data. If the request fails, it switches to fallback sample data and shows a warning notice.

5. **Data Normalisation**

   `normaliseHawker()` converts each raw API record into a cleaner object. This makes the rest of the app easier to work with.

6. **Closure Logic**

   The app compares the selected date against each hawker centre's cleaning dates.

   - If the selected date falls within a closure period, the centre is marked as `closed`.
   - If the next closure is within 14 days, the centre is marked as `soon`.
   - Otherwise, the centre is marked as `open`.

7. **Rendering**

   `render()` updates the page whenever the user searches, filters, changes the date, sorts, saves a favourite, or reloads the API.

8. **Favourites**

   `toggleFavourite()` saves and removes favourite hawker centres using `localStorage`, so favourites remain after refreshing the page.

9. **Nearby Alternatives**

   `getNearbyAlternatives()` uses latitude and longitude to estimate nearby open hawker centres. It uses the Haversine formula to calculate distance between two coordinates.

10. **Safety and Accessibility**

   API text is escaped before being rendered into the page. This prevents accidental HTML injection. The app also includes focus styles, status messages, icon buttons, and clear empty/error states.

## File Structure

```text
.
|-- index.html
|-- css
|   `-- styles.css
|-- js
|   `-- app.js
`-- README.md
```

## How to Run

Open `index.html` directly in a browser, or run a local server:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## Suggested Demo Flow

1. Open the app.
2. Search for `Adam Road`.
3. Change the date to `30 March 2026`.
4. Show that Adam Road Food Centre becomes `Closed today`.
5. Click `View details`.
6. Show closure dates and nearby alternatives.
7. Save it as a favourite.
8. Switch to the `Favourites` filter.
9. Point out the icon buttons and status colours to explain the visual design choices.

## Testing Plan

| Test Case | Steps | Expected Result |
| --- | --- | --- |
| API loading | Open the app with internet access | Live Data.gov.sg data loads and a success notice appears |
| Search | Type `Adam Road` | Results narrow to matching hawker centres |
| Filter open | Click `Open today` | Only open centres are shown |
| Filter closed | Select a known closure date, then click `Closed today` | Closed centres for that date are shown |
| Demo date | Choose `30 March 2026` | Adam Road Food Centre is marked closed |
| Details panel | Click `View details` | Closure dates, address, stall count, image, and alternatives appear |
| Favourites | Click `Save`, then `Favourites` | Saved centre appears in favourites |
| Sort | Change sort option | Results reorder based on selected sort |
| Icon buttons | Check search, reload, save, details, and map actions | Buttons show clear icons together with text labels |
| API fallback | Test with network unavailable | Sample data appears with a warning notice |
| Responsive layout | Resize browser to mobile width | Layout stacks cleanly and remains usable |
| Keyboard access | Tab through buttons and inputs | Focus outline appears clearly |

## Design Rationale

The interface is designed to be direct and task-focused. Users usually arrive with one question: whether a hawker centre is available on a certain date. The search bar, status labels, and date selector are therefore placed at the top of the page.

The status cards give a quick overview of how many centres are open, closing soon, or closed. The details panel gives deeper information only after the user selects a hawker centre, which keeps the main results list easier to scan.

The updated typography makes the page easier to scan, while icon buttons make common actions such as searching, saving favourites, reloading the API, and opening maps feel clearer. The app also uses clear colour-coded labels and text labels together, so users do not need to rely only on colour.

The navigation includes an original hawker-style logo mark created with HTML and CSS instead of copied artwork. This gives the app a more distinctive Singapore food identity while avoiding copyright issues.

## Limitations

- Nearby alternatives are based on straight-line distance, not walking or public transport distance.
- The app depends on the Data.gov.sg dataset being available and updated.
- The app does not include live stall-level information because the dataset only provides hawker centre-level closure dates.

## Credits

Data source: Data.gov.sg and National Environment Agency.
