# Remote laboratory

This project aims to develop a laboratory server for providing remote experiments using actual instrumentation.
Three options of interface are planned:

- VNC or RDP (useful for workstations and Windows-based instrumentation);
- web (many recent instruments provide a remote panel accessible through web, e.g. Tektronix eScope)
- VXI-11 (to be included)

## For deployment

### frontend
1. Change localhost to the host address in the environment variable VITE_HOST_ADDRESS in .env file
2. Build Vue application:
    npm run build
3. Copy the content of the generated dist folder to the websiet folder (e.g. /var/www/html/)

### backend
Start the node server:
    npm start

