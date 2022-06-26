/* 
    @author Shivendra Mishra
    @created 12/08/2021
*/
import { LightningElement, api, wire, track} from 'lwc';

const RECORDS_PER_PAGE = [{label:'5',value:'5'},
                        {label:'10',value:'10'},
                        {label:'20',value:'20'},
                        {label:'50',value:'50'},
                        {label:'100',value:'100'}];

// default page size when component loads
const DEFAULT_PAGE_SIZE_ON_LOAD = '20';
const DEFAULT_PAGE_NUMBER = 1;

export default class ListViewBaseCmp extends LightningElement {
    // This property gives the sort order direction either 'asc' or 'desc'
    @api sortOrderDirectionDef;
    // This property gives the fieldname used for default sorting
    @api sortOrderFieldDef;
    // This property gives user an option to enable or disable sorting
    //TODO this isn't hooked up to anything? Looked like the same in original code
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

    //This is the real data.  The record contains all records to display (not paged)
    //Columns are the configuration for columns
    //Pass in the total record data
    @api allRecords;
    //Pass in the column details
    @api columns;

    //This is the list of currently filtered records (i.e. during search, which records match)
    filteredRecords;

    //Key variable to store data
    // Initializing the variables
    pageSize;
    pageNumber = DEFAULT_PAGE_NUMBER;
    sortDirection;
    sortedBy;
    searchKey;

    disableBack;
    disableForward;

    showPagination = true; //Show/hide pagination
    pageSizeOptions = RECORDS_PER_PAGE;
    beginIndex = 0;
    endIndex = 0;
    startIndex = 1;
    totalPages = 0;

    tableData=[];
    noRecordsFound=false;
    recordCount;  

    @api savedState
  
    /**
     * The connected callback initialises the table
     * Current assumption is that record 
     */
    connectedCallback(){ 
        try {
            //Parse the record data.  This needs to passed in as a string as records not supported
            this.allRecords = JSON.parse(this.allRecords);
            //The filtered records is the list of records that should be displayed across all pages.
            //Filtering is done when records are searched.  Initialise to all.
            this.filteredRecords = this.allRecords;
            this.recordCount = this.allRecords.length;

            if (this.recordCount < 1){
                this.noRecordsFound=true;
            }
            //Inialise the tableData (one page) to the whole thing
            this.tableData = this.allRecords;
            //Initialise the pages and sorting 
            this.initialiseState();
            console.log('pgno1: '+this.pageNumber);
            this.calculatePagination();
            console.log('pgno2: '+this.pageNumber);
            //TODO still experimental
            this.sortTableData();
            //console.log('pgno3: '+this.pageNumber);
        } catch (e){
            //Display an error or display nothing?
        }
    }

    /**
     * This initialised the UI state.
     * Either uses the saved state values, or initialises to defaults.
     * 
     */
    initialiseState() {
        //Deafult
        this.sortDirection = this.sortOrderDirectionDef;
        this.sortedBy=this.sortOrderFieldDef;
        //TODO it makes more sense for the page size to be the recordCountForPagination? (or closest to it)
        if(this.recordCount > this.recordCountForPagination) {
            this.pageSize = DEFAULT_PAGE_SIZE_ON_LOAD;
        } else {
            this.pageSize = this.recordCount;
        }
        console.log('SavedState: '+this.savedState);
        if (this.savedState) {
            try {
                console.log('Start');
                let savedStateObj = JSON.parse(this.savedState);
                this.pageSize = savedStateObj.pageSize;
                this.pageNumber = savedStateObj.pageNumber;
                this.sortedBy = savedStateObj.sortedBy;
                this.sortDirection = savedStateObj.sortDirection;
                this.searchKey = savedStateObj.searchKey;
                console.log('End');
                if(this.searchKey){
                    this.filteredRecords=this.searchKeyFilter(this.searchKey);
                }

            } catch (e){
                console.log('error: '+e);
                //If we can't get state back, fail silently, as at least it'll still work
            }
        }

    }

    @api getCurrentState() {
        let savedStateObj = {}
        savedStateObj.pageSize = this.pageSize;
        savedStateObj.pageNumber = this.pageNumber;
        savedStateObj.sortedBy = this.sortedBy;
        savedStateObj.sortDirection = this.sortDirection;
        savedStateObj.searchKey = this.searchKey;
        return JSON.stringify(savedStateObj);
    }

    handleRecordsPerPage(event){
        this.pageSize = event.target.value;
        this.pageNumber = 1;
        this.getPageOfRecords(this.filteredRecords);
    }

    handlePageNumberChange(event) {
        this.pageNumber = event.target.value;
        if (this.pageNumber == null || this.pageNumber =='') {
            this.pageNumber = 1;
        }
        this.getPageOfRecords(this.filteredRecords);
    }

    goToFirst() {
        this.pageNumber = 1;
        this.getPageOfRecords(this.filteredRecords);
    }

    goToPrevious() {
        this.pageNumber -= 1;
        this.getPageOfRecords(this.filteredRecords);
    }

    goToNext() {
        this.pageNumber += 1;
        this.getPageOfRecords(this.filteredRecords);
    }

    goToLast() {
        this.pageNumber = this.totalPages;
        this.getPageOfRecords(this.filteredRecords);
    }

    getPageOfRecords(records) {
        this.totalPages = Math.ceil(this.recordCount/this.pageSize);
        if (this.pageNumber > this.totalPages) {
            this.pageNumber = this.totalPages;
        }
        if (this.pageNumber < 1) {
            this.pageNumber = 1;
        }
        this.beginIndex = (this.pageNumber-1)*parseInt(this.pageSize);
        this.startIndex = this.beginIndex + 1;
        if (this.pageSize > this.recordCount) {
            this.endIndex = this.recordCount;
        }
        else {
            this.endIndex = parseInt(this.beginIndex) + parseInt(this.pageSize);
        }
        if (this.endIndex > this.recordCount ) {
            this.endIndex = this.recordCount;
        }
        // filtering the record as per pagination inputs
        this.tableData = records.slice(this.beginIndex,this.endIndex);
        this.renderButtons();
    }

    renderButtons() {
        if (this.pageNumber == 1) {
            this.disableBack = true;
        }
        else {
            this.disableBack = false;
        }
        if (this.pageNumber == this.totalPages) {
            this.disableForward = true;
        }
        else {
            this.disableForward = false;
        }   
    }

    // Sorting
    sortBy(field, reverse, primer) {
        const key = primer
            ? function (x) {
                  return primer(x[field]);
              }
            : function (x) {
                  return x[field];
              };

        return function (a, b) {
            a = key(a);
            b = key(b);
            return reverse * ((a > b) - (b > a));
        };
    }

    // this event is called when we change the sort order of a field
    onHandleSort(event) {
        const { fieldName: sortedBy, sortDirection } = event.detail;
        this.sortDirection = sortDirection;
        this.sortedBy = sortedBy;
        this.sortTableData(sortedBy, sortDirection);
    }

    sortTableData() {
        this.filteredRecords = [...this.filteredRecords];
        this.filteredRecords.sort(this.sortBy(this.sortedBy, this.sortDirection === 'asc' ? 1 : -1));
        //after sorting. Go to first page.  This makes as much sense as can when sorting?  Potentially go to the page you are on?
        //TODO confirm if this is correct
        //this.goToFirst();
        this.getPageOfRecords(this.filteredRecords);
    }

    // this method implements the search functionality
    handleKeyChange(event) {
        this.searchKey = event.target.value;
        if(this.searchKey){
            this.filteredRecords=this.searchKeyFilter(this.searchKey);
        }
        else {
            this.filteredRecords = this.allRecords;
        }

        //recalcuate pagination and sorting after search
        this.sortTableData();
        this.calculatePagination();
    }

    calculatePagination() {
        this.recordCount = this.filteredRecords.length;
        if(this.recordCount > this.recordCountForPagination) {
            this.showPagination = true;
            this.getPageOfRecords(this.filteredRecords);
        } else {
            this.showPagination = false;
        }   
    }



    /**
     * Based on the searchKey -- filter all records and return the filtered array
     */
    searchKeyFilter(searchKey) {
        //TODO need to pass in the search fieldNames -- this is slightly different than the the columns based on URL
        const fieldPathArray = this.columns.map(el => el.fieldName);
        console.log(JSON.stringify(this.columns, null, 2));
        let searchFilteredArray = this.allRecords.filter(row => {
            //Element is a single record.  This is returning true if it matches filter
            //First only look at columns that are in the table (fieldPathArray)
            //These columns come from the FieldPath attribute in the columns array.
            //Note that the field path needs to bet he LABEL -- currently this is incorrectly the url.
            //Search for the field path array to find a match to the search key in the row
            //findIndex will return first match (true) or -1 (false)
            let matchedIndex = fieldPathArray.findIndex(fieldPath => { 
                //get the cell.  For this record.  For this column
                let cell = row[fieldPath];
                let isMatch = this.searchKeyWordCheck(cell,searchKey);
                return isMatch;
            });
            console.log(matchedIndex + JSON.stringify(row));
            //If theres a match in a cell, then this whole row is a match. Return true.
            return matchedIndex >= 0;
        });
        return searchFilteredArray;
    }

    

    // HSST-2865 Add actions to the list view. Fire event to be handled by parent component.
    handleRowAction(event) {
        const cEvent = new CustomEvent('rowaction', {
            detail: {
                row: event.detail.row.Id,
                action: event.detail.action.name,
                rowdetail: event.detail.row
            } 
        });
        this.dispatchEvent(cEvent);
    }

    //Method to check search key word present in recordlist
    searchKeyWordCheck(cell,searchKey){
        console.log(cell);
        //TODO -- might want to check that this record can be co-erced to string?
        if(cell && cell.toLowerCase().includes(searchKey.toLowerCase())){
            console.log('true ' + cell + ' ' + searchKey);
            return true;
        }
        return false;
    }
}