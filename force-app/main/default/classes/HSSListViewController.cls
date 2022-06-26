/**************************************************************************
* Class Name: HSSListViewController
* Created by: Shivendra Mishra
* Date Created: August 12, 2021
* Comment: This class manages field metadata and record data for the listViewCmp LWC
* User Stories: HSST-2808, HSST-720, HSST-721
* History: 
*  14/09/21 HSST-2865 Stefi E. Removed cache so the list view can be refreshed when a record is deleted.
* *************************************************************************/
public with sharing class HSSListViewController {
    
    // This methods takes Object API name, FieldSet of that object and if any filters to be used in SOQL and
    // returns a serialized string which contains the metadata and data required for table creation.
    @AuraEnabled
    public static string fetchListViewData(string objAPIName, string fieldSetName, string filters){
        
        // fetch current user details only for the external users
        User currentUser;
        String strContactId;
        // sterilising the inputs given to method
        objAPIName = String.escapeSingleQuotes(objAPIName);
        fieldSetName= String.escapeSingleQuotes(fieldSetName);
        
        if(!(UserInfo.getUserType()=='Standard')) {
        currentUser = [SELECT Id, ContactId, Name FROM User WHERE Id=:UserInfo.getUserId()];
        // We are overriding the contactId variable being passed in the filters with below variables
        // which will  replace it with actual Ids of current logged-in external user
        strContactId = currentUser.ContactId;
        }        

        Map<String, String> returnMap = new Map<String,String>();
        List<String> listOfFields = new List<String>();
        List<ColumnData> columnDataVar = new List<ColumnData>();
        String query; 
        
        if(!String.isEmpty(objAPIName) && !String.isEmpty(fieldSetName)){

        try {
            SObject sObj = (SObject)(Type.forName('Schema.'+ objAPIName).newInstance());
            // get fields from fieldset
            List<Schema.FieldSetMember> lstFSMember = 
                sObj.getSObjectType().getDescribe().fieldSets.getMap().get(fieldSetName).getFields();
                
                // looping over the fieldsetMember object
                for(Schema.FieldSetMember f : lstFSMember) {

                    ColumnData fieldData = new ColumnData();
                    fieldData.label = f.getLabel();
                    fieldData.type = String.valueOf(f.getType());
                    // in case of a lookup field modifying it to give Name in place of ID.
                    if (String.valueOf(f.getType())=='Reference') {
                        // for standard field
                        if(f.getFieldPath().endsWith('Id')) {
                            fieldData.fieldPath = f.getFieldPath().substringBeforeLast('Id')+'.Name';
                        // for custom field
                        } else {
                            fieldData.fieldPath = f.getFieldPath().substringBeforeLast('__c')+'__r.Name';
                        }
                    } else {
                        fieldData.fieldPath = f.getFieldPath();
                    }
                    columnDataVar.add(fieldData);
                    // Creating a list of fieldNames to be used in query
                    listOfFields.add(fieldData.fieldPath); 
                }  
                    // dynamic query
                    query = 'SELECT ID,'+String.join(listOfFields, ',')+' FROM '+objAPIName;

                    if(filters != null && filters != '') {
                        query= query+ ' ' +filters;
                }
                    // Getting records from the database
                    List<SObject> lstOfRecords = Database.query(query);

                    // serializing JSON in order to return it as a string
                    returnMap.put('FIELD_LIST', JSON.serialize(columnDataVar));
	                returnMap.put('RECORD_LIST', JSON.serialize(lstOfRecords));
	                    return JSON.serialize(returnMap);
            }
            // in case of any exception 
            catch (Exception e) {
                throw new AuraHandledException('Something went wrong: '+e.getMessage());
            }
        }

        return null;
        
    }
    // ColumnData wrapper class to store tabledata
    public class ColumnData{
        @AuraEnabled public String label;
        @AuraEnabled public String fieldPath;
        @AuraEnabled public String type;
    }
}