# Hawker Open or Not

Hawker Open or Not is a Singapore-focused web app that helps users check whether a hawker centre is open today, closing soon, or closed for cleaning.

The app uses official NEA hawker centre cleaning closure data from Data.gov.sg and presents it in a simpler, mobile-friendly interface for everyday users.

## Project Theme

Digital Inclusion / Daily Life Convenience

The app helps students, working adults, elderly residents, and families avoid wasted trips to hawker centres that are closed for cleaning. It turns public government data into a searchable and easy-to-understand experience.

## Features

- Search hawker centres by name or address
- Filter by:
  - All hawker centres
  - Open today
  - Closing soon
  - Closed today
  - Favourites
- View official cleaning closure dates
- See address, food stall count, market stall count, photo, and description
- Save favourite hawker centres using `localStorage`
- Open the hawker centre location in Google Maps
- View nearby open alternatives based on latitude and longitude
- Fallback sample data if the live API cannot be loaded

## API Used

Dataset: Dates of Hawker Centres Closure  
Agency: NEA, via Data.gov.sg

API endpoint used:

```text
https://data.gov.sg/api/action/datastore_search?resource_id=d_bda4baa634dd1cc7a6c7cad5f19e2d68&limit=500
```

Dataset page:

```text
https://data.gov.sg/datasets/d_bda4baa634dd1cc7a6c7cad5f19e2d68/view
```

## File Structure

```text
.
├── index.html
├── css
│   └── styles.css
├── js
│   └── app.js
└── README.md
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

## Testing Plan

1. Search for a known hawker centre, such as `Adam Road`.
2. Check that results update while typing.
3. Click `View details` and confirm closure dates appear.
4. Click `Save` and confirm the hawker centre appears under the `Favourites` filter.
5. Test the status filters: `Open today`, `Closing soon`, and `Closed today`.
6. Test sorting by name, next closure, and most food stalls.
7. Click `Open map` and confirm it opens a map link.
8. Resize the browser to mobile width and confirm the layout remains readable.
9. Temporarily block network access and confirm fallback sample data appears.

## Credits

Data source: Data.gov.sg and National Environment Agency.
