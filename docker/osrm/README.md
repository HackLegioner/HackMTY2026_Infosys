# OSRM Docker Setup for Monterrey

1. Download Monterrey / Nuevo León OSM extract:
   ```bash
   curl -O http://download.geofabrik.de/north-america/mexico-latest.osm.pbf
   ```
2. Extract and build routing graph:
   ```bash
   docker run -t -v "${PWD}/data/osrm:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/monterrey.osm.pbf
   docker run -t -v "${PWD}/data/osrm:/data" osrm/osrm-backend osrm-partition /data/monterrey.osrm
   docker run -t -v "${PWD}/data/osrm:/data" osrm/osrm-backend osrm-customize /data/monterrey.osrm
   ```
3. Run routing container:
   ```bash
   docker-compose up -d osrm
   ```
