export function upgradeUrl(url) {
    // Upgrade a URL from http to https.
    if (url.indexOf("http://") === 0 && window.location.href.indexOf("https://") === 0) {
        url = url.replace("http://", "https://");
    }

    return url;
}
