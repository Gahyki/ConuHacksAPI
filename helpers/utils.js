module.exports = { 
    isNullOrUndefined(obj) {
        return obj === undefined || obj === null;
    },
    isEmptyOrNull(obj, ...fields) {
        for(let field of fields)
            if(obj[field] === null || obj[field] == undefined || obj[field] === '')
                return true;
        return false;
    },
    validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }
}
