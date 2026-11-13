# ArcGIS Online Assistant (Deprecated)

**This app is deprecated. The hosted app will be removed on January 1, 2027.**

ArcGIS Online Assistant is a legacy utility for copying content, viewing and editing item JSON, and updating service URLs in ArcGIS Online and Portal for ArcGIS. This repository contains its source code.

## Building the Legacy App

The app uses old dependencies and build tooling. These instructions are retained for developers working with the existing source.

1. Install Node.js and clone this repository.
2. Run `npm install` in the project folder.
3. Register an application in your portal to obtain an OAuth app ID, using your app's hosting location as the redirect URI.
4. Update `config.appId` and `config.portalUrl` in [package.json](package.json).
5. Run `npm run build` to generate the app in the `build` folder. Run `npm run serve` to preview it locally at `localhost:8080`.

## License

Copyright 2015 Esri. Licensed under the Apache License, Version 2.0. See [license.txt](license.txt).

[](Esri Tags: ArcGIS-Online Portal Assistant Copy Javascript)
[](Esri Language: JavaScript)
