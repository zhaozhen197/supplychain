'use strict';


// Utility class for ledger state
const State = require('../ledger-api/state.js');
const  rawMaterialsOrderState= require('./OrderState').rawMaterialsOrderState;

class RawMaterialsOrder extends State {


    constructor(obj) {
        super(RawMaterialsOrder.getClass(), [obj.rawMaterialsOrderId]);
        Object.assign(this, obj);
    }


    /*
     * Definition:  RawMaterialsOrder Order:
     *
     * {String}  rawMaterialsOrderId
     * {String}  rawMaterialsBatchId
     * {String}  rawMaterialsType
     * {String}  manufacturer
     * {float}   price
     * {Integer} quantity
       {String} shipperId
       {Enumerated orderStates} currentOrderState
       {String} modifiedBy
       *{String[]} info
     * */
    /**
     * Basic getters and setters
     */
    getId() {
        return this.orderId;
    }

    setStateToRawMaterialsOrderCreated(){
        this.currentState = rawMaterialsOrderState.RAW_MATERIALS_ORDER_CREATED;
    }

    setStateToRawMaterialsOrderReceived(){
        this.currentState = rawMaterialsOrderState.RAW_MATERIALS_ORDER_RECEIVED;
    }
    setStateToRawMaterialsOrderShipmentAssigned(){
        this.currentState = rawMaterialsOrderState.RAW_MATERIALS_ORDER_SHIPMENT_ASSIGNED;
    }

    setStateToRawMaterialsOrderShipmentCreated(){
        this.currentState = rawMaterialsOrderState.RAW_MATERIALS_ORDER_SHIPMENT_CREATED;
    }

    setStateToRawMaterialsOrderShipmentInTransit(){
        this.currentState= rawMaterialsOrderState.RAW_MATERIALS_ORDER_SHIPMENT_IN_TRANSIT;
    }

    setStateToRawMaterialsOrderShipmentReceived(){
        this.currentState = rawMaterialsOrderState.RAW_MATERIALS_ORDER_RECEIVED;
    }

    setStateToRawMaterialsOrderClosed(){
        this.currentState = rawMaterialsOrderState.RAW_MATERIALS_ORDER_CLOSED;
    }

    static fromBuffer(buffer) {
        return RawMaterialsOrder.deserialize(Buffer.from(JSON.parse(buffer)));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to  RawMaterialsOrder
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return State.deserializeClass(data, RawMaterialsOrder);
    }

    /**
     * Factory method to create a order object
     */
    static createInstance(orderId) {
        return new RawMaterialsOrder({orderId});
    }

    static getClass() {
        return 'org.supplychainnet.RawMaterialsOrder';
    }

}

module.exports = RawMaterialsOrder;