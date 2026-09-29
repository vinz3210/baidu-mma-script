# Baidu for Map Making App

A Tampermonkey userscript that adds Baidu Street View to [map-making.app](https://map-making.app).

## Userscript: `map-making-baidu.user.js`

Install: open the raw file in Tampermonkey (or paste it into a new script), then reload your map.

- **Coverage overlay** – Baidu's street view lines drawn on the map (tick "Baidu coverage + click to add pano").
- **Click to add** – clicking the map adds the nearest Baidu pano as a location (GCJ02 coordinates, tagged `baidu`).
- **Panorama viewer** – Baidu locations open in a Pannellum viewer inside the app's own street view panel.
- **Moving** – arrows to step to neighbouring panos; the location's saved position and heading follow.
- **Export** – "Export Baidu locations" downloads GeoGuessr-style Baidu JSON.

The basemap is assumed to be Google's (GCJ02 in China). On the OSM basemap the coverage lines sit a few hundred metres off.

## How it works

- Coverage tiles: `mapsv{0,1}.bdimg.com/tile/?qt=tile&styles=pl&x&y&z`, reprojected from Baidu Mercator and recoloured with a CSS filter.
- Lookup: `?qt=qsdata` (nearest pano) and `?qt=sdata` (metadata, roads, neighbours).
- Panorama: `?qt=pdata&sid=ID&pos=row_col&z=4` tiles stitched into an equirect image.
- Bearing at image column `u` is `360*u - NorthDir`.
