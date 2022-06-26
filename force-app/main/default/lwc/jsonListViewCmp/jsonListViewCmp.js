/**************************************************************************

**************************************************************************/
import { LightningElement,api } from 'lwc';
import {
    FlowAttributeChangeEvent,
    FlowNavigationNextEvent,
} from 'lightning/flowSupport';
import { createActionsColumn, createDateColumn, createUrlColumn, createStringColumn, createButtonColumn, joinFromObjectItems, getFromPath } from 'c/listViewUtilCmp';
import { safeSplit } from 'c/stringUtilCmp';

/** 
 * Constants
 * 
*/
//Matches the pattern or sometexthere{23}
//essentially any digits inside curly braces after some text
//This is the pattern used to configure a column that join fields in an array
const JOIN_COL_REGEX = /(.*?)\{(\d*?)\}/;
const COLUMN_SEPARATOR = ',';
export default class JsonListViewCmp extends LightningElement {


    /** All the below needs to be copied and pasted for components extending list view base cmp if 
     * these should be exposed or dynamically set.
     * Note that there is a known LWC issue for exposing child api attributes in metadata, 
     * otherwise potentially could have extended base component instead of using composition
     * https://salesforce.stackexchange.com/questions/248180/how-can-we-expose-inherited-properties-from-a-super-component-s-class-in-a-light
     */
    // This property is used to get the Object API name
    @api SFDCobjectApiName;
    // This property is used to get the Fieldset name
    @api fieldSetName;
    // This property is used to check if first column is needed as a hyperlink
    @api filters;
    // This property gives the sort order direction either 'asc' or 'desc'
    @api sortOrderDirectionDef;
    // This property gives the fieldname used for default sorting
    @api sortOrderFieldDef;
    // This property gives user an option to enable or disable sorting
    @api sortingEnabled;
    // This property gives user an option to enable or disable search functionality
    @api searchBarEnabled;
    // This property is used to get the dynamic label of datatable
    @api label;
    // This property is used to get the placeholder text for search box
    @api searchPlaceholder;
    // This property is used to get the display text when table is empty
    @api displayText;
    // This property gives the minimum number of records to be present in table in order to have pagination
    @api recordCountForPagination;
    // Actions to display per row in the table. If none are provided, the action button is not displayed
    @api actions;
    // Minimum width of each column
    @api minColumnWidth;
    // Mode of columns i.e., auto or fixed
    @api columnWidthMode;

    //Local variables for column and data table array content.
    columns;
    tableDataJson;
    @api rawTableData;
    @api selectedId;
    @api selectedRow;

    @api buttonUrl;

    //Used to control when the child component is rendered.  
    //Must be after data is gathered, otherwise re-rendering is very painful to kick off elegantly
    dataIsLoaded = false;

    handleRowAction;

    /**
     * Columns labels are comma separated list of labels.
     * Column field name are comma separated list of field names where:
     * - thisname = field name in json
     * - thisname.subname = nested structure in the the json.  Can be nested as far as works
     * - thisname.subname{3} = nested array in the json.  take this value from the array substructure and concatenate up to max of 3
     * Column types are either date or string
     * Button Label, if it exists, creates a button, styled as a link, on far right.  This label is the text
     * Id Field is the field in the table that is saved in selectedId when the button is selected.c/customNavigationButtonCmp
     * 
     * Note that the lengths don't need to match -- but all is driven from the column label array.
     * 
     * 
     */
     @api columnLabelsRaw;
     @api columnFieldNamesRaw;
     @api columnTypesRaw;
     @api buttonLabel;
     @api idField;
     @api savedState;

    connectedCallback() { 
        //Create the structure columns as per LWC tableData definition
        this.columns = this.createColumns();

        //Create the table data to use.  This is transformed so that all columns are at the first level
        //that is -- any nested columns are flattened.
        this.tableDataJson = this.transformTableData();

        console.log(this.tableDataJson, null, 2);
        console.log(this.columns, null, 2);

        //Update to trigger load of listViewBase
        this.dataIsLoaded = true;
    }

    createColumns() {
        var columnLabels = safeSplit(this.columnLabelsRaw, COLUMN_SEPARATOR);
        var columnTypes = safeSplit(this.columnTypesRaw, COLUMN_SEPARATOR);
        var columnFieldNames = safeSplit(this.columnFieldNamesRaw, COLUMN_SEPARATOR);

        //First -- create the columns.
        //This is based on the field labels, field names, and field type.
        var cols = [];
        for (let i=0; i<columnFieldNames.length; i++) {
            //The label is the label
            let colLabel = columnLabels?.[i];
            //The field name is the fieldname without the curly braces
            let fieldName = this.stripCurleyBraces(columnFieldNames[i]);
            
            //The column type currently supports date and string (the default)
            let colType = columnTypes?.[i] ?? '';
            switch (colType.toLowerCase()) {
                case "date":
                    cols.push(createDateColumn(colLabel, fieldName,this.sortingEnabled));
                    break;
                default:
                    cols.push(createStringColumn(colLabel, fieldName, this.sortingEnabled));
            }
        }

        //If there is a button label -- add this to far right
        if (this.buttonLabel) {
            cols.push(createButtonColumn(this.buttonLabel));
            this.handleRowAction = this.handleNextAction;
        }
        //Support for future functionality new browser window may be preferred  
        if (this.buttonUrl) {
            this.handleRowAction = this.handleNewWindowAction;
        } 
        return cols;
    }


    transformTableData() {
        var columnFieldNames = safeSplit(this.columnFieldNamesRaw, COLUMN_SEPARATOR);

        //Next.  Parse the json data and convert it according to tht rules.
        let tableDataRecords = JSON.parse(this.rawTableData);

        //The specialFields are those that need to be converted.  That is-- they are different than just first level field
        //That means that any field name with a dot is special
        let fieldsWithDot = columnFieldNames.filter(fieldname => fieldname.includes('.'));

        let tableArray = tableDataRecords
        //Use map -- for each item in the table data, convert it as follows:
        .map(rec => {
            //Go through each of the special fields to "add" them into the object.
            //NOTE:  must use arrow notation as am referring to "this" inside.
            fieldsWithDot.forEach(fieldWithDot => { 
                //First, figure out if this is of hte format xxxx.dddd{num} 
                //If it is.  Then this is a nested array.  Join it using the method
                if (fieldWithDot.match(JOIN_COL_REGEX)) {
                    let newFieldName = this.stripCurleyBraces(fieldWithDot);
                    rec[newFieldName] = this.joinFieldForArray(rec, fieldWithDot);
                } else {
                    //get the value using string as path.
                    rec[fieldWithDot] = getFromPath(rec, fieldWithDot);
                }
            });
            return rec;
        });

        return JSON.stringify(tableArray);
    }

    /**
     * Handles the button event
     * This handler sets the following attributes in the LWC
     *  - selectedRow
     *  - selectedId
     *  - savedState
     *  and then goes to NEXT.
     * @param {*} event 
     */
    handleNextAction(event){
        this.selectedRow = JSON.stringify(event.detail.rowdetail, null, 2);
        this.selectedId = event.detail.rowdetail[this.idField];
        this.savedState = this.template.querySelector('c-list-view-base-cmp').getCurrentState();

        const navigateNextEvent = new FlowNavigationNextEvent();
        this.dispatchEvent(navigateNextEvent);
    }

    /**
     * Handles the button event
     * This handler opens a new window with the flow URL and selectedId passed in
     * The flow URL is currently not exposed in the template as it is for future use.
     * @param {*} event 
     */
    handleNewWindowAction(event) {
        let newUrl = this.buttonUrl + '?' + this.idField + '=' + event.detail.rowdetail[this.idField];
        window.open(newUrl, "_blank", "location=yes,height=570,width=750,scrollbars=yes,status=yes");
    }


    /**
     * Strips curley braces, and anything inside, from a string
     * @param {*} str 
     * @returns 
     */
    stripCurleyBraces(str) {
        if (str && typeof str === 'string') {
            return str.replace(/\{.*?\}/g, "");
        }
        return str;
    }

    /**
     * Helper method manipulate the incoming JSON structure.
     * 
     * This particular manipulation will take an array of objects, 
     * and convert it into once merged field.
     * For example -- if you have
     * { "key1": "stuff"
     *   "key2": [ {"subkey1": "a", "subkey2" "b"},
     *              {"subkey1": "c", "subkey2" "d"},
     *            ]
     * }
     * and the keyfield is: key2.subkey2{2}
     * this returns -- "b, d"
     * 
     * @param {*} obj the records as parsed from JSON
     * @param {*} fieldPattern the field pattern -- eg. field.subfield{5}
     * @returns the joined string.
     */
    joinFieldForArray(obj, fieldPattern) {
        //First, figure out if this is of the format xxxx.dddd{num} 
        let nestedArrayMatch = fieldPattern.match(/(.*?)\{(.*?)\}/);
        //If it is.  Then this is a nested array.  Join it using the method
        if (nestedArrayMatch) {
            //This gets the part BEFORE the {num}
            let newFieldName = nestedArrayMatch[1];
            //This gets the contents of {}
            let maxlength = nestedArrayMatch[2];
            //Split the name -- for example a.b, with b the arrary -- or a.b.c with c being the array.
            let fieldPath = newFieldName.slice(0, newFieldName.lastIndexOf('.'));
            //This is the array field 
            let arrayField =  newFieldName.slice(newFieldName.lastIndexOf('.')+1);
            //This is the array field (e.g. diagnoses or results.diagnoses)
            let nestedArray = getFromPath(obj, fieldPath);
            //Finally -- join the result of the fields.
            let joinedResult =  joinFromObjectItems(nestedArray, arrayField, '\n', maxlength);
            return joinedResult;
        } else {
            //If it doesn't match the pattern
            return null;
        }
    }

}