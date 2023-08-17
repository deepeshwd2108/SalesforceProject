import { LightningElement, track, api, wire } from 'lwc';
import { updateRecord } from 'lightning/uiRecordApi';
import {ShowToastEvent} from "lightning/platformShowToastEvent";
import GetRateCardDetails from '@salesforce/apex/AWBManifestationComponentController.getRateCardDetails';
import GenerateAWBNumber from '@salesforce/apex/AWBManifestationComponentController.generateAWBNumber';
import ID_FIELD from '@salesforce/schema/Order.Id';
import AWB_NUMBER_FIELD from '@salesforce/schema/Order.AWB_Number__c';
import DELIVERY_PARTNER_FIELD from '@salesforce/schema/Order.Delivery_Partner__c';
import RATE_CARD_FIELD from '@salesforce/schema/Order.Rate_Card__c';
import Status_FIELD from '@salesforce/schema/Order.Status';
import SUB_Status_FIELD from '@salesforce/schema/Order.Sub_Status__c';
import IS_LOGISTICS_PARTNER_VERIFIED from '@salesforce/schema/Order.Is_Logistics_Partner_Verified__c';
const columns = [
    { label: 'Delivery Partner', fieldName: 'Delivery_Partner__c' },
    { label: 'Delivery Percentage', fieldName: 'Delivery_Percentage__c'},
    { label: 'Delivery Rate', fieldName: 'Rate__c'},
    { label: 'Serviceable', fieldName: 'isServiceable__c'},
    { label: 'Priority', fieldName: 'Priority__c'},
];
export default class AWBManifestationComponent extends LightningElement {

    data;
    @track isLoaded=false;
    @track buttonDisabled = false;
    @api recordId;

    @wire(GetRateCardDetails, {orderId: '$recordId'})
    rateCardData({data, error}){
        try {
            if(data){
                this.data = data;
                console.log(JSON.stringify(data));
                let foundelement = this.data.find(ele => ele.isServiceable__c == true);
                console.log(foundelement);
                if(foundelement != null){
                    this.value = foundelement.Delivery_Partner__c;
                    this.buttonDisabled = false;
                    console.log('Success');
                } else{
                    this.buttonDisabled = true;
                    console.log('error');
                    this.showNoDeliveryPartnerToast = true;
                    this.showNoDeliveryPartnerError();
                }
            } else{
                console.log(JSON.stringify('text', error.message));
                this.error = error;
            }
        } catch (error) {
            this.error = error;
        }
        
    }
    columns = columns;

    value = 'Ecom Express';
    get options() {
        return [
        { label: 'Ecom Express', value: 'Ecom Express' },
        { label: 'Shipdelight', value: 'Shipdelight' },
        { label: 'Smartship', value: 'Smartship' },
        { label: 'Xpressbees', value: 'Xpressbees' },
        ];
    }

    showToast(message, type) {
        const event = new ShowToastEvent({
            title: type,
            message: message,
            variant: type,
            mode: 'sticky'
        });
        this.dispatchEvent(event);
    }

    handleDeliveryPartnerChange(event){
        this.value = event.target.value;
        let foundelement = this.data.find(ele => ele.Delivery_Partner__c == event.target.value);
        if(foundelement != null){
            console.log('Test ', foundelement);
            if(foundelement.isServiceable__c == false){
                this.buttonDisabled = true;
                this.errorMessage = 'This delivery partner is not serviceable please choose another one';
                this.recordError = true;
            } else{
                this.buttonDisabled = false;
                this.errorMessage = '';
                this.recordError = false;
            }
        } else{
            this.buttonDisabled = true;
            this.errorMessage = 'This delivery partner is not serviceable please choose another one';
            this.recordError = true;
        }
    }

    showNoDeliveryPartnerError(){
        const evt = new ShowToastEvent({
            title: 'No Delivery Partner Available',
            message: 'No serviceable delivery partner available. For more detail contact your supervisor',
            variant: 'error'
        });
        this.dispatchEvent(evt);
    }

    onButtonClick(){
        this.isLoaded = true;
        GenerateAWBNumber({odrId: this.recordId, deliveryPartner: this.value})
        .then(result=>{
            if(result.Status == 'Success'){
                console.log(result.odr);
                console.log('Result ' + JSON.stringify(result.odr));
                const fields = {};
                fields[ID_FIELD.fieldApiName] = result.odr.Id;
                fields[AWB_NUMBER_FIELD.fieldApiName] = result.odr.AWB_Number__c;
                fields[DELIVERY_PARTNER_FIELD.fieldApiName] = result.odr.Delivery_Partner__c;
                fields[RATE_CARD_FIELD.fieldApiName] = result.odr.Rate_Card__c;
                fields[SUB_Status_FIELD.fieldApiName] = 'Partner Assignment';
                fields[IS_LOGISTICS_PARTNER_VERIFIED.fieldApiName] = true;
                const recordInput = { fields };
                updateRecord(recordInput)
                .then(() =>{
                    this.showToast(result.Message, result.Status);
                })
                .catch((error) => {
                    console.log('error 1'+ error.stack);
                    this.showToast('Please Contact Admin', 'Error');
                    console.log('Please Contact Admin', 'Error');
                });
            } else{
                this.showToast(result.Message, result.Status);
                console.log(result);
                this.isLoaded = false;
            }
        })
        .catch(error=>{
            this.isLoaded = false;
            console.log('error 2'+ error.stack);
            this.showToast('Please Contact Admin', 'Error');
            console.log('Please Contact Admin', 'Error');
        })
        .finally(()=>{
            this.isLoaded = false;
        })
        
    }
}