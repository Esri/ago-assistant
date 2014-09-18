define(["jquery"], function (jquery) {
    return {
        arrayToString: function (array) {
            // Convert an array to a comma separated string.
            var arrayString;
            jquery.each(array, function (index, arrayValue) {
                if (index === 0) {
                    arrayString = arrayValue;
                } else if (index > 0) {
                    arrayString = arrayString + "," + arrayValue;
                }
            });
            return arrayString;
        }
    };
});