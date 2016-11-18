import * as core from "./core";
import * as users from "./users";
import * as content from "./content";
import * as hosting from "./hosting";
import * as info from "./info";
import * as utils from "./util";

export class Portal {
    constructor({
        portalUrl = "https://www.arcgis.com",
        username = "",
        token = "",
        withCredentials = false
    } = {}) {
        // Portal properties.
        this.portalUrl = portalUrl;
        this.username = username;
        this.token = token;
        this.withCredentials = withCredentials;
        this.items = [];
        this.services = [];

        // Core portal methods.
        this.generateToken = core.generateToken;
        this.search = core.search;
        this.self = core.self;
        this.version = core.version;

        // User methods.
        this.userContent = users.userContent;
        this.userProfile = users.userProfile;

        // Content methods.
        this.itemDescription = content.itemDescription;
        this.itemData = content.itemData;
        this.addItem = content.addItem;
        this.updateWebmapData = content.updateWebmapData;
        this.updateDescription = content.updateDescription;
        this.updateData = content.updateData;
        this.updateUrl = content.updateUrl;

        // Hosted Services methods.
        this.serviceDescription = hosting.serviceDescription;
        this.serviceLayers = hosting.serviceLayers;
        this.layerRecordCount = hosting.layerRecordCount;
        this.createService = hosting.createService;
        this.addToServiceDefinition = hosting.addToServiceDefinition;
        this.checkServiceName = hosting.checkServiceName;
        this.harvestRecords = hosting.harvestRecords;
        this.addFeatures = hosting.addFeatures;
        this.cacheItem = hosting.cacheItem;
    }
}

export function itemInfo(type) {
    return info.items(type);
}

// Make the utils available on the core module.
export let util = utils;
