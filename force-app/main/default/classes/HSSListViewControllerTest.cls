@isTest
public with sharing class HSSListViewControllerTest {
    // Creating Test data
    @TestSetup
    static void makeData(){
        Id vendorRecordTypeId = Schema.SObjectType.Account.getRecordTypeInfosByName().get('Vendor').getRecordTypeId();
        Account acc = new Account(
            Name = 'Test Account',
            recordtypeId = vendorRecordTypeId,
            Billing_Verification_Status__c = 'verified',
            Location__c = 'Auckland City',
            ACC_Vendor_Id__c = 'ABC1234'
        );
        insert acc;
        Contact con1 = new Contact(
            AccountId = acc.Id,
            LastName = 'Test Contact1',
            ACC_Provider_Id__c = 'SDC3421'

        );
        insert con1;
        Contact con2 = new Contact(
            AccountId = acc.Id,
            LastName = 'Test Contact2',  
            ACC_Provider_Id__c = 'SWZ3423'
        );
        insert con2;
        Id rtId = Schema.SObjectType.HealthCloudGA__ReciprocalRole__c.getRecordTypeInfosByName()
                            .get('Contact Role').getRecordTypeId();
        HealthCloudGA__ReciprocalRole__c role = new HealthCloudGA__ReciprocalRole__c(
            recordtypeId = rtId,
            Name = 'Provider',
            HealthCloudGA__InverseRole__c = 'Provider Administrator',
            HealthCloudGA__RelationshipType__c = 'Contact Contact Relation'
        );
        insert role;
        HealthCloudGA__ContactContactRelation__c relCon = new HealthCloudGA__ContactContactRelation__c(
            HealthCloudGA__Contact__c = con1.Id,
            HealthCloudGA__RelatedContact__c = con2.Id,
            HealthCloudGA__Role__c = role.Id
        );
        insert relCon;
    }

    // Testing the method when we pass the correct Object, Fieldset and SOQL filter
    @isTest
    static void fetchListViewDataWithFilterTest(){
        Test.startTest();
        String fieldsAndRecordsList1 = HSSListViewController.fetchListViewData('Contact','providerFieldSet','where Id != null');
        Test.stopTest();
        System.assert(!String.isEmpty(fieldsAndRecordsList1));
        System.assert(fieldsAndRecordsList1.contains('Test Contact'));
    }

    // Testing the method when we pass the correct Object and Fieldset with no filters
    @isTest
    static void fetchFieldsAndRecordsWithoutFilterTest() {
        Test.startTest();
        String fieldsAndRecordsList2 = HSSListViewController.fetchListViewData('HealthCloudGA__ContactContactRelation__c','providerFieldSet','');
        Test.stopTest();
        System.assert(!String.isEmpty(fieldsAndRecordsList2));
        System.assert(fieldsAndRecordsList2.contains('Test Account'));
    }
    
    // Testing the method when we do not provide either Object or FieldSet 
    @isTest
    static void fetchNoFieldsAndRecordsTest() {
     	Test.startTest();
        String fieldsAndRecordsList3 = HSSListViewController.fetchListViewData('Contact','','');
        Test.stopTest();
        System.assert(String.isEmpty(fieldsAndRecordsList3));   
    }

    // Testing the method in case of an exception
    @isTest
    static void fetchException() {
        Test.startTest();
        try {
            String fieldsAndRecordsList4 = HSSListViewController.fetchListViewData('Contct','providerFieldSet','');
        }
        catch (AuraHandledException e) {
            System.assertEquals('Script-thrown exception', e.getMessage());
        }
        
        Test.stopTest();
    }

}