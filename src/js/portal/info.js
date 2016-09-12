import {types} from "./items.json";

export function items(type) {
    let info = types.filter(function(item) {
        return item.type === type;
    })[0];
    info = typeof info !== "undefined" ? info : {icon: "datafilesGray"};
    return info;
}
