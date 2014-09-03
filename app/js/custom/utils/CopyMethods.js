// return the methods copy from the clazz prototype methods

Custom.utils.copyMethods = function(clazz) {
	var rslt = new clazz();
	rslt.parent = {};
    for (var key in rslt) {
        rslt.parent[key] = rslt[key];
    }

    rslt.setup = function() {
		for (var att in this.parent) {
            if (this.parent[att] === undefined) {
                this.parent[att] = this[att];
            }
        }
    };

    return rslt;
};