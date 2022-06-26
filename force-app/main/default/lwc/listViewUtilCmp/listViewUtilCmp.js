/**************************************************************************
**************************************************************************/
import TIME_ZONE from '@salesforce/i18n/timeZone';

/**
 * Creates a date column config
 * Returns the object to use in listview array. 
 * Sets display config and timezone to NZ
 * 
 * @param {*} colLabel label
 * @param {*} fieldPath date field value 
 * @returns object to use in listview Columns array
 */
var  createDateColumn = (colLabel, fieldPath, isSortable) => {
    return {
        label: colLabel,
        fieldName: fieldPath,
        type: "date",
        typeAttributes: {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: TIME_ZONE,
            hour12: "false"    
        },
        sortable: (typeof isSortable === 'undefined' || isSortable === null) ? true: isSortable,
        hideDefaultActions: true
    };
}

/**
 * Returns a URL column config
 * Returns the object to use in listview array. 
 * 
 * TODO -- this is the similar to below and can be merged.  There are subtle differences
 * and not sure which is true spec.
 * 
 * If the Column Label is Actions -- then 
 * the column is created, with a link with text View and URL of the content
 * 
 * @param {*} colLabel label
 * @param {*} fieldPath field value (in this case a URL)
 * @returns object to use in listview Columns array
 */
 var  createActionsColumn = (colLabel, fieldPath, isSortable) => {
    return {
        label: colLabel,
        fieldName: fieldPath,
        fixedWidth: 80,
        type: 'url', 
        cellAttributes: {
            class: 'accLinkUnderline'
        },
        typeAttributes: {
            label: 'View',
            target: '_self'
        },
        sortable: (typeof isSortable === 'undefined' || isSortable === null) ? true: isSortable,
        hideDefaultActions: true
    };
}

/**
 * Creates a URL column config.
 * Returns the object to use in listview array. 
 * 
 * @param {*} colLabel label
 * @param {*} fieldPath date field value 
 * @returns object to use in listview Columns array
*/
var  createUrlColumn = (colLabel, fieldPath, isSortable) => {
    return {
        label: colLabel, 
        fieldName: 'urlField',
        type: 'url',
        cellAttributes: {
            class: 'accLinkUnderline'
        }, 
        typeAttributes: { 
            label: {
                fieldName: fieldPath
            },
            target: '_self'
        },
        sortable: (typeof isSortable === 'undefined' || isSortable === null) ? true: isSortable,
        hideDefaultActions: true
    };
}

/**
 * Returns a date object ot use in listview.
 * Sets display config and timezone to NZ
 * 
 * @param {*} colLabel label
 * @returns object to use in listview Columns array
 */
 var  createButtonColumn = (colLabel) => {
    return {
            label: 'Actions',
            type: 'button',
            typeAttributes: {  
                label: colLabel,  
                name: colLabel,  
                title: colLabel,  
                disabled: false,  
                variant: 'Base',  
            },
            hideDefaultActions: true,
            sortable: false
    };
}


/**
 * Returns a date object ot use in listview.
 * Sets display config and timezone to NZ
 * Sortable is optional.  Defaults to true.
 * 
 * @param {*} colLabel label
 * @param {*} fieldPath date field value 
 * @returns object to use in listview Columns array
 */
 var  createStringColumn = (colLabel, fieldPath, isSortable) => {
    return {
            label: colLabel, 
            fieldName: fieldPath,
            hideDefaultActions: true,
            wrapText: true,
            sortable: (typeof isSortable === 'undefined' || isSortable === null) ? true: isSortable,
    };
}

/**
 * https://stackoverflow.com/questions/19098797/fastest-way-to-flatten-un-flatten-nested-json-objects
 * Recursively flattens a JSON object using dot notation.
 *
 * NOTE: input must be an object as described by JSON spec. Arbitrary
 * JS objects (e.g. {a: () => 42}) may result in unexpected output.
 * MOREOVER, it removes keys with empty objects/arrays as value (see
 * examples below).
 *
 * @example
 * // returns {a:1, 'b.0.c': 2, 'b.0.d.e': 3, 'b.1': 4}
 * flatten({a: 1, b: [{c: 2, d: {e: 3}}, 4]})
 * // returns {a:1, 'b.0.c': 2, 'b.0.d.e.0': true, 'b.0.d.e.1': false, 'b.0.d.e.2.f': 1}
 * flatten({a: 1, b: [{c: 2, d: {e: [true, false, {f: 1}]}}]})
 * // return {a: 1}
 * flatten({a: 1, b: [], c: {}})
 *
 * @param obj item to be flattened
 * @param {Array.string} [prefix=[]] chain of prefix joined with a dot and prepended to key
 * @param {Object} [current={}] result of flatten during the recursion
 *
 */
var flattenJson = (obj, prefix, current) => {

    prefix = prefix || []
    current = current || {}
  
    if (typeof (obj) === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        flattenJson(obj[key], prefix.concat(key), current)
      })
    } else {
      current[prefix.join('.')] = obj
    }
    return current
  }

/**
 * Returns a new object having stripped out all attributes except those in the the valid keys array
 * @param {*} obj the javascript objects
 * @param {*} validKeys array of valid keys
 * @returns a new object only with those valid keys
 */
var returnNewObjectOnlyValidKeys = (obj, validKeys) => {
    const newObject = {};
    Object.keys(obj).forEach(key => {
      if (validKeys.includes(key)) newObject[key] = obj[key];
    });
    return newObject;
}

/**
 * Takes a list of object and returns a single string.
 * The single string contains the joined values from all items in the list. 
 * e.g.
 * sample = [
                {
                    "diagnosisCodeType": null,
                    "diagnosisCode": "S5V0.",
                    "diagnosisDescription": "Rupture achilles tendon",
                    "snomedCode": "262988007",
                    "snomedCodeDescription": "Traumatic division of tendo achilles (disorder)",
                    "injuryStatus": "Approved",
                    "resultErrorCode": "EM00",
                    "resultError": null,
                    "diagnosisAction": null,
                    "diagnosisSide": "left"
                },
                {
                    "diagnosisCodeType": null,
                    "diagnosisCode": "S5504",
                    "diagnosisDescription": "Sprain, tendocalcaneus (Achilles tendon)",
                    "snomedCode": "275335003",
                    "snomedCodeDescription": "Ruptured Achilles tendon - traumatic (disorder)",
                    "injuryStatus": "Provisional",
                    "resultErrorCode": "EM00",
                    "resultError": null,
                    "diagnosisAction": null,
                    "diagnosisSide": "left"
                }
            ]

 * joinFromObjectItems(sample, "diagnosisDescription", ', ', 3)
             returns "Rupture achilles tendon, Sprain, tendocalcaneus (Achilles tendon)"

 * @param {*} objList array of objects
 * @param {*} objKey  the key in the object to use
 * @param {*} separator the separator string
 * @param {*} maxnum the maxnum to return
 * @returns String a join of all strings in the array with that value.
 */
var joinFromObjectItems = (objList, objKey, separator, maxnum) => {
    var stringArr = objList.reduce(function (result, item, i) {
        if (result.length < maxnum) {
            if (!result.includes(item[objKey])) {
                result.push(item[objKey]);
            }
        }
        return result;
    }, []);

    return stringArr.join(separator);
}

/**
 * Gets the value at the path specified.
 * @param {*} object the specific javascript object
 * @param {*} path the string path e.g. first.second.third
 * @returns the value based on the path
 */
var getFromPath = (object, path) => path.split('.').reduce((o, p) => o?.[p], object);


export { createActionsColumn, createDateColumn, createUrlColumn, createStringColumn, createButtonColumn, flattenJson, returnNewObjectOnlyValidKeys, joinFromObjectItems, getFromPath };