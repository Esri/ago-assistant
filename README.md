# ago-assistant

This app uses the [ArcGIS REST API](http://www.arcgis.com/apidocs/rest/) to provide several different utilities for working with content in [ArcGIS Online](http://www.arcgis.com/home/) and [Portal for ArcGIS](http://www.esri.com/software/arcgis/portal-for-arcgis).

[View it live](https://ago-assistant.esri.com)

![App](ago-assistant.png)

## Features
* Copy content between Portals and Organizations
* View and edit the JSON of content
* Update the URLs of services in a web map
* Update the URL of a registered application or service
* View user stats

## Instructions

1. Fork and then clone the repo -OR- [download a recent release](https://github.com/Esri/ago-assistant/releases).
2. Run and try the samples.

#### Building the app
This project uses npm scripts to automate building and optimizing the application. It does a handful of things for you that will make it easier to configure and deploy this application to your own web server.

  * Download and install [node.js](http://nodejs.org/).
  * Download or clone this project to your machine.
  * Go to the project folder in your terminal or command prompt and run `npm install` to install the project dependencies.
  * [Register the app in your portal](http://server.arcgis.com/en/server/latest/administer/linux/add-items.htm#ESRI_SECTION1_0D1B620254F745AE84F394289F8AF44B) to obtain an `appId` for using the OAuth dialog to log in. Be sure to add the correct redirect URI (the location where your app will be hosted).
  * Update the config section in [`package.json`](package.json) with your portal's url and new `appId`.
  * Run `npm run build` to generate an optimized build in the `build` folder.
    * You can run the app locally for development and testing with the command `npm run serve`. Your browser should automatically open to `localhost:8080`. 
    * Deploy the contents of the `build` folder to your own web server to distribute the app throughout your organization.

## Requirements

* Notepad or your favorite HTML editor
* Web browser with access to the Internet

## Resources

* [ArcGIS REST API](http://www.arcgis.com/apidocs/rest/)

## Issues

Find a bug or want to request a new feature?  Please let us know by [submitting an issue](https://github.com/Esri/ago-assistant/issues/new).

## Contributing

Anyone and everyone is welcome to contribute.

## Licensing
Copyright 2015 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](license.txt) file.

[](Esri Tags: ArcGIS-Online Portal Assistant Copy Javascript)
[](Esri Language: JavaScript)
