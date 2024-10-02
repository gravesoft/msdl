const langsUrl = "https://www.microsoft.com/en-us/api/controls/contentinclude/html?pageId=cd06bda8-ff9c-4a6e-912a-b92a21f42526&host=www.microsoft.com&segments=software-download%2cwindows11&query=&action=getskuinformationbyproductedition&sdVersion=2";
const downUrl = "https://www.microsoft.com/en-us/api/controls/contentinclude/html?pageId=cfa9e580-a81e-4a4b-a846-7b21bf4e2e5b&host=www.microsoft.com&segments=software-download%2Cwindows11&query=&action=GetProductDownloadLinksBySku&sdVersion=2";
const sessionUrl = "https://vlscppe.microsoft.com/fp/tags?org_id=y6jn8c31&session_id="

const apiUrl = "https://api.gravesoft.dev/msdl/"

const sessionId = document.getElementById('msdl-session-id');
const msContent = document.getElementById('msdl-ms-content');
const pleaseWait = document.getElementById('msdl-please-wait');
const processingError = document.getElementById('msdl-processing-error');

const productsList = document.getElementById('products-list');
const backToProductsDiv = document.getElementById('back-to-products');

const sharedSessionGUID = "47cbc254-4a79-4be6-9866-9c625eb20911";

let availableProducts = {};
let sharedSession = false;
let shouldUseSharedSession = true;
let skuId;

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function updateVars() {
    let id = document.getElementById('product-languages').value;
    if (id == "") {
        document.getElementById('submit-sku').disabled = 1;
        return;
    }

    document.getElementById('submit-sku').disabled = 0;

    return JSON.parse(id)['id'];
}

function updateContent(content, response) {
    content.innerHTML = response;
    let errorMessage = document.getElementById('errorModalMessage');

    if (errorMessage) {
        processingError.style.display = "block";
        return false;
    }

    return true;
}

function onLanguageXhrChange() {
    if (!(this.status == 200))
        return;

    if (pleaseWait.style.display != "block")
        return;

    pleaseWait.style.display = "none";
    msContent.style.display = "block";

    if (!updateContent(msContent, this.responseText))
        return;

    let submitSku = document.getElementById('submit-sku');
    submitSku.setAttribute("onClick", "getDownload();");

    let prodLang = document.getElementById('product-languages');
    prodLang.setAttribute("onChange", "updateVars();");

    updateVars();
}

function onDownloadsXhrChange() {
    if (!(this.status == 200))
        return;

    if (pleaseWait.style.display != "block")
        return;

    msContent.style.display = "block";

    let wasSuccessful = updateContent(msContent, this.responseText);

    if (wasSuccessful) {
        pleaseWait.style.display = "none";
        if (!sharedSession) {
            fetch(sessionUrl + sharedSessionGUID);
            fetch(sessionUrl + "de40cb69-50a5-415e-a0e8-3cf1eed1b7cd");
            fetch(apiUrl + 'add_session?session_id=' + sessionId.value)
        }
    }
    else if (!sharedSession && shouldUseSharedSession) {
        useSharedSession();
    }
    else {
        getFromServer();
    }
}

function getFromServer() {
    processingError.style.display = "none";
    let url = apiUrl + "proxy" + "?product_id=" + window.location.hash.substring(1) +
        "&sku_id=" + skuId;
    let xhr = new XMLHttpRequest();
    xhr.onload = displayResponseFromServer;
    xhr.open("GET", url, true);
    xhr.send();
}

function displayResponseFromServer() {
    pleaseWait.style.display = "none";

    if (!(this.status == 200)) {
        processingError.style.display = "block";
        alert(JSON.parse(this.responseText)["Error"])
        return;
    }
    msContent.innerHTML = this.responseText
}

function getLanguages(productId) {
    let url = langsUrl + "&productEditionId=" + productId +
        "&sessionId=" + (sharedSession ? sharedSessionGUID : sessionId.value);

    let xhr = new XMLHttpRequest();
    xhr.onload = onLanguageXhrChange;
    xhr.open("GET", url, true);
    xhr.send();
}

function getDownload() {
    msContent.style.display = "none";
    pleaseWait.style.display = "block";

    skuId = skuId ? skuId : updateVars();

    let url = downUrl + "&skuId=" + skuId + "&sessionId=" + (sharedSession ? sharedSessionGUID : sessionId.value);

    let xhr = new XMLHttpRequest();
    xhr.onload = onDownloadsXhrChange;
    xhr.open("GET", url, true);
    xhr.send();
}

function backToProducts() {
    backToProductsDiv.style.display = 'none';
    productsList.style.display = 'block';
    msContent.style.display = 'none';
    pleaseWait.style.display = 'none';
    processingError.style.display = 'none';

    window.location.hash = "";
    skuId = null;
}

function useSharedSession() {
    sharedSession = true;
    retryDownload();
}

function retryDownload() {
    pleaseWait.style.display = "block";
    processingError.style.display = 'none';

    let url = langsUrl + "&productEditionId=" + window.location.hash.substring(1) + "&sessionId=" + sharedSessionGUID;
    let xhr = new XMLHttpRequest();
    xhr.onload = getDownload;
    xhr.open("GET", url);
    xhr.send();

}

function prepareDownload(id) {
    productsList.style.display = 'none';
    backToProductsDiv.style.display = 'block';
    pleaseWait.style.display = "block";

    const xhr = new XMLHttpRequest();
    xhr.onerror = () => { getLanguages(id) };
    xhr.open("GET", sessionUrl + sessionId.value, true);
    xhr.send();
}

function addTableElement(table, value, data) {
    let a = document.createElement('a')
    a.href = "#" + value;
    a.setAttribute("onClick", "prepareDownload(" + value + ");");
    a.appendChild(document.createTextNode(data[value]))

    let tr = table.insertRow();

    let td = tr.insertCell();
    td.appendChild(a);

    let td2 = tr.insertCell();
    td2.appendChild(document.createTextNode(value))
}

function createTable(data, search) {
    let table = document.getElementById('products-table-body');
    let regex = new RegExp('' + search + '', 'ig');

    table.innerHTML = "";

    for (value in data) {
        if (data[value].match(regex) == null)
            continue;

        addTableElement(table, value, data);
    }
}

function updateResults() {
    let search = document.getElementById('search-products');
    createTable(availableProducts, search.value);
}

function setSearch(query) {
    let search = document.getElementById('search-products');
    search.value = search.value == query ? null : query;
    updateResults();
}

function checkHash() {
    let hash = window.location.hash;
    if (hash.length == 0)
        return

    prepareDownload(hash.substring(1))
}

function preparePage(resp) {
    availableProducts = JSON.parse(resp);
    if (!availableProducts) {
        pleaseWait.style.display = 'none';
        processingError.style.display = 'block';
        return;
    }

    pleaseWait.style.display = 'none';
    productsList.style.display = 'block';

    updateResults();
    checkHash();
}

sessionId.value = uuidv4();

let xhr = new XMLHttpRequest();

xhr.onload = function () {
    if (this.status != 200) {
        pleaseWait.style.display = 'none';
        processingError.style.display = 'block';
        return;
    }

    preparePage(this.responseText);
};

xhr.open("GET", 'data/products.json', true);
xhr.send();

pleaseWait.style.display = 'block';

let mxhr = new XMLHttpRequest();

mxhr.onload = function () {
    if (this.status != 200) {
        shouldUseSharedSession = false;
    }
};
mxhr.open("GET", apiUrl + "use_shared_session", true);
mxhr.send();
