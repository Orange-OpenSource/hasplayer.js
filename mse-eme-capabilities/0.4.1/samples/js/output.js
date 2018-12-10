var xhtml_ns = "http://www.w3.org/1999/xhtml";

function Output() {
    this.output_document = null;
    this.output_node = null;
}

Output.prototype.resolve_log = function () {
    var node = document.getElementById("log");
    if (!node) {
        if (!document.body || document.readyState == "loading") {
            return;
        }
        node = document.createElement("div");
        node.id = "log";
        document.body.appendChild(node);
    }
    this.output_document = document;
    this.output_node = node;

    var supportedNode = document.getElementById("supported_sections");
    if (!supportedNode) {
        supportedNode = document.createElementNS(xhtml_ns, "sections");
        supportedNode.id = "supported_sections";
        this.output_node.appendChild(supportedNode);
    }

    var resultsNode = document.getElementById("results_sections");
    if (!resultsNode) {
        resultsNode = document.createElementNS(xhtml_ns, "sections");
        resultsNode.id = "results_sections";
        this.output_node.appendChild(resultsNode);
        var html = "<table id='results'>" +
            "<thead><tr><th>Result</th><th>Test Name</th>" +
            "<th>Message</th></tr></thead>" +
            "<tbody>";
        html += "</tbody></table>";
        this.output_node.lastChild.innerHTML = html;
    }
};

Output.prototype.add_supported_codecs = function (codecs) {
    if (!this.output_node) {
        this.resolve_log();
    }

    var supportedNode = document.getElementById("supported_sections");
    if (!supportedNode) {
        return;
    }

    var div = document.createElement('div');
    div.id = "codecs";
    div.innerHTML = 'Supported Codecs';
    supportedNode.appendChild(div);

    var list = document.createElement('ul');
    list.setAttribute("class", "supported_list");
    div.appendChild(list);

    for (var i = 0; i < codecs.length; i++) {
        var li = document.createElement('li');
        li.innerHTML = codecs[i];
        list.appendChild(li);
    }
};

Output.prototype.add_supported_CDM = function (cdms) {
    if (!this.output_node) {
        this.resolve_log();
    }

    var supportedNode = document.getElementById("supported_sections");
    if (!supportedNode) {
        return;
    }

    var div = document.createElement('div');
    div.id = "cdms";
    div.innerHTML = 'Supported CDMs';
    supportedNode.appendChild(div);

    var list = document.createElement('ul');
    list.setAttribute("class", "supported_list");
    div.appendChild(list);

    for (var i = 0; i < cdms.length; i++) {
        var li = document.createElement('li');
        li.innerHTML = cdms[i];
        list.appendChild(li);
    }
};

Output.prototype.add_result = function (name, support, message) {

    if (!this.output_node) {
        this.resolve_log();
    }

    var resultsNode = document.getElementById("results_sections");
    if (!resultsNode) {
        return;
    }
    var tableRef = document.getElementById('results').getElementsByTagName('tbody')[0];

    // Insert a row in the table at the last row
    var newRow = tableRef.insertRow(tableRef.rows.length);

    // Fill the new row
    var newCell = newRow.insertCell(0);
    var span = document.createElement('span');
    span.innerHTML = '';
    span.setAttribute("class", support ? "ok" : "ko");
    newCell.appendChild(span);

    newCell = newRow.insertCell(1);
    var testName = document.createTextNode(name);
    newCell.appendChild(testName);

    newCell = newRow.insertCell(2);
    var messageText = message ? document.createTextNode(message) : document.createTextNode('');
    newCell.appendChild(messageText);
};

Output.prototype.add_test_time = function (started, ended) {

    var timeNode = document.getElementById("time");
    if (!timeNode) {
        if (!document.body || document.readyState == "loading") {
            return;
        }
        timeNode = document.createElement("div");
        timeNode.id = "time";
        document.body.appendChild(timeNode);
    }

    var title = document.getElementById("title");
    title.innerHTML += 'Tests run in ' + ((ended - started) / 1000).toPrecision(3) + 's';
};
