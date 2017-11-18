import { upgradeUrl } from "../util";

class CopyStatusTracker {

    constructor(name, onStatusChange, resolve, reject) {
        this.name = name;
        this.onStatusChange = onStatusChange;
        this.resolve = resolve;
        this.reject = reject;
        this.queue = null;
        this.layerJobs = {};
        this.layerSummary = {};
        this.totalNumberOfRecords = 0;
        this.numberOfFinishedRecords = 0;
        this.startTime = new Date();
        this.finishTime = null;
        this.percentComplete = 0;
        this.hasErrors = false;
        this.messages = [];
        this.summary = [];
        this.newItemId = null;
    }

    estimateFinishTime() {
        if (this.percentComplete >= 100 || !this.totalNumberOfRecords < 0 || (!this.numberOfFinishedRecords && this.totalNumberOfRecords > 0)) {
            return;
        }
        const percentComplete = this.numberOfFinishedRecords / this.totalNumberOfRecords;
        this.percentComplete = percentComplete * 100;
        this.finishTime = new Date(this.startTime * 1 + (new Date() - this.startTime) / percentComplete);
    }

    getStatus() {
        this.estimateFinishTime();
        if (Object.keys(this.layerJobs).length === 0 && Object.keys(this.layerSummary).length > 0) { // all layers have completed
            this.percentComplete = 100;
            this.messages.push("Copy complete, with " + (this.hasErrors ? "" : "no ") + "errors");
            this.summary.push("Copy summary for " + this.name);
            this.hasErrors = false;
            Object.keys(this.layerSummary).forEach(k => {
                const numAdded = this.layerSummary[k].added.toLocaleString([]);
                const numExpected = this.layerSummary[k].recordCount.toLocaleString([]);
                this.summary.push(`${k} (${this.layerSummary[k].name}): Added ${numAdded} of ${numExpected} records`);
                if (numAdded !== numExpected) {
                    this.hasErrors = true;
                }
            });
        }

        const status = {
            message: this.messages[this.messages.length - 1],
            type: this.hasErrors ? "warn" : "info",
            estimatedFinish: this.finishTime,
            percentComplete: this.percentComplete,
            itemId: this.newItemId,
            cancelMethod: () => {
                this.queue.cancel();
                this.messages.push("Copy cancelled by user");
                this.summary.push("Copy operation cancelled by user");
                if (this.newItemId) {
                    this.summary.push(`New feature service created (item id: ${this.newItemId})`);
                    this.summary.push("Not all features were copied from source");
                }
                this.hasErrors = true;
                this.percentComplete = 100;
                this.reject(this.getStatus());
            }
        };

        if (this.percentComplete == 100) {
            status.summary = this.summary.join("\n");
            if (this.hasErrors) {
                this.reject(status);
            } else {
                this.resolve(status)
            }
        }

        return status;
    }

    updateLayerStatus(layerId) {
        // Check if the current layer's requests have all finished.
        // Using 'attempted' handles both successes and failures.
        if (this.layerJobs[layerId].attempted >= this.layerJobs[layerId].recordCount) {
            this.queue.destinationPortal.layerRecordCount(this.queue.destinationUrl, layerId)
                .then(records => {
                    this.layerJobs[layerId].added = records.count;
                    this.layerSummary[layerId] = this.layerJobs[layerId];
                    delete this.layerJobs[layerId];
                    this.getStatus();
                });
        }
        this.getStatus();
    }

    addMessage(message) {
        if (this.queue.cancelled) {
            return;
        }
        this.messages.push(message);
        const status = this.getStatus();
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
    }

}

class AddRecordsQueue {

    constructor(statusTracker, sourcePortal, destinationPortal, totalWorkers) {
        this.statusTracker = statusTracker;
        this.statusTracker.queue = this;
        this.sourcePortal = sourcePortal;
        this.destinationPortal = destinationPortal;
        this.destinationUrl = null;
        this.queue = [];
        this.totalWorkers = totalWorkers;
        this.cancelled = false;
    }

    cancel() {
        this.cancelled = true;
    }

    addItems(sourceUrl, destinationUrl, layerId, totalCount, numRecordsPer) {
        this.destinationUrl = destinationUrl;
        for (let i = 0; i < totalCount; i += numRecordsPer) {
            this.queue.push({
                sourceUrl: sourceUrl,
                destinationUrl: destinationUrl,
                layerId: layerId,
                startRecord: i,
                numRecordsPer: (i + numRecordsPer > totalCount) ? totalCount - i : numRecordsPer,
                status: "pending",
                attempts: 0
            });
        }
    }

    getQueueItem() {
        return this.queue.find(itm => itm.status == "pending");
    }

    doWork(workerId) {
        const queueItem = this.getQueueItem();
        if (!queueItem || this.cancelled) {
            return;
        }
        queueItem.status = `working_${workerId}`;
        queueItem.attempts++;
        const {sourceUrl, destinationUrl, layerId, startRecord, numRecordsPer} = queueItem;
        this.sourcePortal.harvestRecords(sourceUrl, layerId, startRecord, numRecordsPer)
            .then(serviceData => {
                if (this.cancelled) {
                    return;
                }
                if (queueItem.status != `working_${workerId}`) {
                    queueItem.attempts--;
                    this.doWork(workerId);
                    return;
                }
                this.destinationPortal.addFeatures(destinationUrl, layerId, JSON.stringify(serviceData.features))
                    .then(result => {
                        queueItem.status = "finished";
                        this.statusTracker.layerJobs[layerId].attempted += serviceData.features.length;
                        this.statusTracker.layerJobs[layerId].added += result.addResults.length;
                        this.statusTracker.numberOfFinishedRecords += result.addResults.length;
                        const numAdded = this.statusTracker.numberOfFinishedRecords.toLocaleString([]);
                        const numExpected = this.statusTracker.totalNumberOfRecords.toLocaleString([]);
                        this.statusTracker.addMessage(`Added ${numAdded} of ${numExpected} records`);
                        this.statusTracker.updateLayerStatus(layerId);
                        if (this.cancelled) {
                            return;
                        }
                        this.doWork(workerId);
                    })
                    .catch(error => { // Catch on addFeatures.
                        // {error:{code: 504, message: "Your request has timed out.", details: []}}
                        queueItem.status = "failed";
                        this.statusTracker.layerJobs[layerId].attempted += serviceData.features.length;
                        this.statusTracker.numberOfFinishedRecords += serviceData.features.length;
                        this.statusTracker.hasErrors = true;
                        this.statusTracker.addMessage(`Possibly failed to add ${numRecordsPer} records to layer "${layerId}" (source layer 'resultOffset'=${startRecord})`);
                        if (error) {
                            this.statusTracker.addMessage(error.toString());
                        }
                        this.statusTracker.updateLayerStatus(layerId);
                        if (this.cancelled) {
                            return;
                        }
                        this.doWork(workerId);
                    });
            })
            .catch(error => { // Catch on harvestRecords.
                if (queueItem.attempts > 3) {
                    queueItem.status = "failed";
                    this.statusTracker.layerJobs[layerId].attempted += numRecordsPer;
                    this.statusTracker.numberOfFinishedRecords += numRecordsPer;
                    this.statusTracker.hasErrors = true;
                    this.statusTracker.addMessage(`Failed to get ${numRecordsPer} records from source layer "${layerId}"\n` +
                        `(source layer 'resultOffset'=${startRecord}), 3 attempts tried`);
                    this.statusTracker.updateLayerStatus(layerId);
                    if (this.cancelled) {
                        return;
                    }
                    this.doWork(workerId);
                } else {
                    queueItem.status = "pending";
                    this.statusTracker.addMessage(`Failed to get ${numRecordsPer} records from source layer "${layerId}"\n` +
                        `(source layer 'resultOffset'=${startRecord}), ${queueItem.attempts} of 3 attempts`);
                    if (this.cancelled) {
                        return;
                    }
                    this.doWork(workerId);
                }
            });
    }

    start() {
        if (this.cancelled) {return;}
        for (let i = 0; i < this.totalWorkers; i++) {
            this.doWork(i);
        }
    }

}

const statusFunction = ({message, type}) => {
    switch (type) {
    case "warn":
        console.warn(message);
        break;
    default:
        console.info(message);
    }
}

export function copyHostedFeatureService({
    sourcePortal,
    sourceItemId,
    destinationPortal,
    destinationFolder,
    destinationName,
    newTags = [],
    numWorkers = 1,
    numRecordsPer = 2000,
    onStatusChange = statusFunction
}) {
    const {description, serviceDescription: serviceDefinition} = Object.assign(
        {}, sourcePortal.getCachedItem(sourceItemId)
    );
    const layers = serviceDefinition.layers;
    delete serviceDefinition.layers;
    serviceDefinition.name = destinationName;
    return new Promise((resolve, reject) => {
        const statusTracker = new CopyStatusTracker(destinationName, onStatusChange, resolve, reject);
        const queue = new AddRecordsQueue(statusTracker, sourcePortal, destinationPortal, numWorkers);
        window.statusTracker = statusTracker;
        statusTracker.addMessage("Creating hosted feature service");
        destinationPortal.createService(destinationPortal.username, destinationFolder, JSON.stringify(serviceDefinition))
            .then(service => {
                statusTracker.newItemId = service.itemId;
                statusTracker.addMessage("Hosted feature service created");
                service.serviceurl = upgradeUrl(service.serviceurl); // Upgrade url to prevent mixed content errors
                queue.destinationUrl = service.serviceurl;

                statusTracker.addMessage("Updating service tags");
                destinationPortal.updateDescription(
                    destinationPortal.username, service.itemId, destinationFolder,
                    JSON.stringify({tags: [...description.tags, ...newTags]})
                );

                statusTracker.addMessage("Gathering details on source feature service layers");
                sourcePortal.serviceLayers(description.url)
                    .then(definition => {
                        definition.layers.forEach(layer => {
                            // Set up an object to track the copy status for this layer.
                            statusTracker.layerJobs[layer.id] = {name: layer.name, recordCount: 0, attempted: 0, added: 0};

                            // Force the spatial reference to 102100.  Don't know why, but if you don't
                            // then geometries not in 102100 end up as null
                            layer.adminLayerInfo = {
                                geometryField: {
                                    name: "Shape",
                                    srid: 102100
                                }
                            };

                            // Clear out the layer's indexes which prevents occasional critical errors on the
                            // addToServiceDefinition call.  Indexes will automatically be created when published.
                            layer.indexes = [];
                        });

                        statusTracker.addMessage(`Adding ${definition.layers.length} layer(s) to service`);
                        destinationPortal.addToServiceDefinition(service.serviceurl, JSON.stringify(definition))
                            .then(response => {
                                if (!("error" in response)) {
                                    const recordCountPromises = [];
                                    layers.forEach(layer => {
                                        const layerId = layer.id;
                                        const url = description.url;
                                        const p = sourcePortal.layerRecordCount(url, layerId);
                                        recordCountPromises.push(p);
                                        p.then(records => {
                                            statusTracker.layerJobs[layerId].recordCount = records.count;
                                            if (statusTracker.totalNumberOfRecords < 0) {
                                                statusTracker.totalNumberOfRecords = 0;
                                            }
                                            statusTracker.totalNumberOfRecords += records.count;
                                            // Set the count manually in weird cases where maxRecordCount is negative.
                                            const count = Math.min(
                                                numRecordsPer,
                                                records.count,
                                                definition.layers[layerId].maxRecordCount < 1 ? 2000 : definition.layers[layerId].maxRecordCount
                                            );
                                            if (!count) {
                                                statusTracker.updateLayerStatus(layerId);
                                            } else {
                                                queue.addItems(url, service.serviceurl, layerId, records.count, count);
                                                statusTracker.addMessage(`Adding records to queue, ${count} at a time`);
                                            }
                                        });
                                    });
                                    Promise.all(recordCountPromises).then(() => {
                                        if (queue.queue.length) {
                                            statusTracker.addMessage(`Copying records, ${queue.queue.length * 2} requests in queue`);
                                            queue.start();
                                        }
                                    });
                                } else {
                                    statusTracker.hasErrors = true;
                                    statusTracker.summary = [
                                        response.error.message,
                                        ...response.error.details
                                    ];
                                    statusTracker.percentComplete = 100;
                                    statusTracker.addMessage(`Failed to update service definition for ${destinationName}`);
                                }
                            })
                            .catch(error => { // Catch on addToServiceDefinition.
                                statusTracker.hasErrors = true;
                                statusTracker.summary = error ? [error.toString()] : ["Request to update service definition failed"];
                                statusTracker.percentComplete = 100;
                                statusTracker.addMessage(`Failed to update service definition for ${destinationName}`);
                            });
                    })
                    .catch(error => {
                        statusTracker.hasErrors = true;
                        statusTracker.summary = error ? [error.toString()] : ["Request to get source layers info failed"];
                        statusTracker.percentComplete = 100;
                        statusTracker.addMessage("Unable to get source layers info");
                    });
            })
            .catch(error => {
                statusTracker.hasErrors = true;
                statusTracker.summary = error ? [error.toString()] : ["Request to create service failed"];
                statusTracker.percentComplete = 100;
                statusTracker.addMessage(`Failed to create service "${destinationName}"`);
            });
    });
}
