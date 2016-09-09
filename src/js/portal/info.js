import {types} from "./items.json";

export function items(type) {
    var info = types.filter(function(item) {
        return item.type === type;
    })[0];

    if (!info) {
        // Handle types not found in the above list.
        return {
            icon: "datafilesGray"
        };
    }

    return info;
}
