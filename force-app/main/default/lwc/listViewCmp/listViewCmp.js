/* 
    @author Shivendra Mishra
    @created 12/08/2021


*/
import { LightningElement, api, wire, track} from 'lwc';
import fetchListViewData from '@salesforce/apex/HSSListViewController.fetchListViewData';

import { createActionsColumn, createDateColumn, createUrlColumn, createStringColumn } from 'c/listViewUtilCmp';

export default class ListViewCmp extends LightningElement {

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
    @api firstColumnAsRecordHyperLink;
    // This property is used to get the SOQL filter condition if required
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
    // This property gives user an option to give column labels seperated by a semicolon
    @api columnLabels;
    // This property is used to get the placeholder text for search box
    @api searchPlaceholder;
    // This property is used to get the display text when table is empty
    @api displayText;
    // This property is used to get the object and field name for Url
    @api urlObjectAndField;
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
    arrColLabels;
    recordArray;
    recordArrayJson;

    //Used to control when the child component is rendered.  
    //Must be after data is gathered, otherwise re-rendering is very painful to kick off elegantly
    dataIsLoaded = false;

    connectedCallback(){ 
        this.fetchRecordsForDatatable();    
    }

    // this method is used to fetch record for datatable, HSST-2865 @api decorated to be able to call this method from a parent.
    @api
    fetchRecordsForDatatable() {
        // HSST-2865 When re-rendering the table, we need to set the loading
        this.dataIsLoaded = false;
        this.recordArray = [];
        if (this.columnLabels != null){
            this.arrColLabels=this.columnLabels.split(';');
        }

        fetchListViewData({ objAPIName: this.SFDCobjectApiName,
            fieldSetName: this.fieldSetName,
            filters: this.filters})
        // getting data from the apex controller and parsing it
        .then(data =>{
            let objStr = JSON.parse(data);  

            let listOfFields=JSON.parse(Object.values(objStr)[1]);
            
            let listOfRecords = JSON.parse(Object.values(objStr)[0]);

            // flattening the JSON in order to access the records having relationship fields
            this.recordArray = this.processFlatten(listOfRecords);
            // in case of first column as a hyperlink, creating the urlField for same
            this.recordArray = this.createURLField(this.recordArray);
            this.recordArrayJson = JSON.stringify(this.recordArray);

            // creating the column structure of datatable
            this.columns = this.createColumns(listOfFields);

            this.dataIsLoaded = true;
            this.error = undefined; 
        })
        // In case of an error while calling apex controller
        .catch(error =>{
            this.error = error;
        }) 
    }

      // Creting column structure for datatable
    createColumns(listOfFields) {
        let cols = [];
        for (let i=0; i<listOfFields.length; i++) {
            /** element is the current field label as returned from apex call
             * format example is: 
             * {
                    fieldPath: "Name"
                    label: "Full Name"
                    type: "STRING"
                }
            */
            let element = listOfFields[i];
            let colLabel = element.label;
            //The single column description
            let colElement;
            //Replace with the label if supplied.
            if(this.arrColLabels && this.arrColLabels[i]) {
                colLabel = this.arrColLabels[i];
            }
            
            
            if(this.firstColumnAsRecordHyperLink==='Yes' && i==0) {
                    colElement = createUrlColumn(colLabel, element.fieldPath);
            } else if (element.type==="DATETIME")  {
                    colElement = createDateColumn(colLabel, element.fieldPath);
            } else if (element.label==='Actions') {
                    colElement = createActionsColumn(colLabel, element.fieldPath);
            } else {
                    colElement = createStringColumn(colLabel, element.fieldPath);
            }
            cols.push(colElement) 
            
        }

        // HSST-2865 Add actions to the list view
        if(this.actions) {
            // Only if actions are provided, we add actions to the list of columns, saved in variable items
            let rowActions = this.actions.split(';').map( action =>  {
                return { label: action , name: action}
            });
            // Pushing the actions into the existing columns list.
            cols.push( { type: 'action', typeAttributes: { rowActions:  rowActions }} ); 
        }
 
        return cols;
    }



    createURLField(recordArray) {
        let recordArrayWithUrl =recordArray;
        if(this.firstColumnAsRecordHyperLink==='Yes'){
            
            let urlField;
            let splitURL=[];
            //retrieve Id, create URL with Id and push it into the array
            recordArrayWithUrl = recordArray.map(item=>{
                if(this.urlObjectAndField) {
                    splitURL = this.urlObjectAndField.split(';');
                    urlField = '/s/'+splitURL[0].toLowerCase()+'/'+item[splitURL[1]]+'/view';
                }else {
                    urlField = '/' + this.SFDCobjectApiName.toLowerCase() + '/' + item.Id + '/view';}
                return {...item,urlField};                     
            });
        } 
        return recordArrayWithUrl;
    }



    processFlatten(listOfRecords){
        // This is the final array into which the flattened response will be pushed. 
        let flattenedArray = [];
        for (let row of listOfRecords) {
            // This const stroes a single flattened row. 
            const flattenedRow = {}
            // Get keys of a single row.
            let rowKeys = Object.keys(row); 
            // Iterate 
            rowKeys.forEach((rowKey) => {
                // Get the value of each key of a single row.
                const singleNodeValue = row[rowKey];
                // Check if the value is a node(object) or a string
                if(singleNodeValue.constructor === Object){
                    // If it's an object flatten it
                    this._flatten(singleNodeValue, flattenedRow, rowKey);     
                }else{
                    // If it’s a normal string push it to the flattenedRow array
                    flattenedRow[rowKey] = singleNodeValue;
                }  
            });
            // Push all the flattened rows to the final array 
            flattenedArray.push(flattenedRow);
        }
        return flattenedArray;
    }

    // Flattening the JSON
    _flatten = (nodeValue, flattenedRow, nodeName) => {        
        let rowKeys = Object.keys(nodeValue);
        rowKeys.forEach((key) => {
            const singleNodeValue = nodeValue[key];
            // Check if the value is a node(object) or a string
            if(singleNodeValue.constructor === Object) {
                // If it's an object flatten it
                let rowKey = Object.keys(singleNodeValue);
                rowKey.forEach((value) => {
                    let finalValue = key + '.'+ value;
                    let finalKey = nodeName +'.'+finalValue;
                    flattenedRow[finalKey] = singleNodeValue[value];
                })
            }
            else {
            let finalKey = nodeName + '.'+ key;
            flattenedRow[finalKey] = nodeValue[key];
            }
        })
    }

    // HSST-2865 Add actions to the list view. Fire event to be handled by parent component.
    // Proxy the event from the base list view.
    handleRowAction(event) {
        //var updateEvent = new CustomEvent("fieldupdate", { detail: event.detail });
        const cEvent = new CustomEvent('rowaction', {
            detail: event.detail
        });

        this.dispatchEvent(cEvent);
    }

}