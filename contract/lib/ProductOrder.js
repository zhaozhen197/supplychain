'use strict';

// Utility class for ledger state
const State = require('../ledger-api/state.js');
const  productOrderState= require('./OrderState').productOrderState;

/**
 * Order class extends State class
 * Class will be used by application and smart contract to define a Order
 */
class ProductOrder extends State {

    constructor(obj) {
        super(ProductOrder.getClass(), [obj.orderId]);
        Object.assign(this, obj);
    }

    /*
    Definition:  Class Order:
      {String}  productOrderId
      {String} productId
      {float}   price
      {Integer} quantity
      {String} producerId
      {String} shipperId
      {String} retailerId
      {Enumerated orderStates} currentOrderState
      {String} modifiedBy
    */

    /**
     * Basic getters and setters
     */
    getId() {
        return this.orderId;
    }

    /*  //  should never be called explicitly;
        //  id is set at the time of constructor call.
        setId(newId) {
            this.id = newId;
        }
    */
    /**
     * Useful methods to encapsulate  Order states
     */
    setStateToProductOrderCreated() {
        this.currentOrderState = productOrderState.PRODUCT_ORDER_CREATED;

    }

    setStateToProductOrderReceived() {
        this.currentOrderState = productOrderState.PRODUCT_ORDER_RECEIVED;
    }

    setStateToProductOrderProducerAssigned(){
        this.currentOrderState = productOrderState.PRODUCT_ORDER_PRODUCER_ASSIGNED;
    }
    setStateToProductOrderProducerReceived(){
        this.currentOrderState = productOrderState.PRODUCT_ORDER_PRODUCER_RECEIVED;
    }
    setStateToProductOrderProducerProducing(){
        this.currentOrderState = productOrderState.PRODUCT_ORDER_PRODUCER_PRODUCING;
    }
    setStateToProductOrderProducerProduced(){
        this.currentOrderState  = productOrderState.PRODUCT_ORDER_PRODUCER_PRODUCED;
    }


    setStateToProductOrderShipmentAssigned() {
        this.currentOrderState = productOrderState.PRODUCT_ORDER_PRODUCER_ASSIGNED;
    }

    setStateToProductOrderShipmentCreated() {
        this.currentOrderState = productOrderState.PRODUCT_ORDER_SHIPMENT_CREATED;
    }

    setStateToProductOrderShipmentInTransit() {
        this.currentOrderState = productOrderState.PRODUCT_ORDER_SHIPMENT_IN_TRANSIT;
    }

    setStateToProductOrderShipmentReceived() {
        this.currentOrderState = productOrderState.PRODUCT_ORDER_SHIPMENT_RECEIVED;
    }

    setStateToProductOrderClosed() {
        this.currentOrderState = productOrderState.PRODUCT_ORDER_CLOSED;
    }

    static fromBuffer(buffer) {
        return ProductOrder.deserialize(Buffer.from(JSON.parse(buffer)));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to  Order
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return State.deserializeClass(data, ProductOrder);
    }

    /**
     * Factory method to create a order object
     */
    static createInstance(orderId) {
        return new ProductOrder({orderId});
    }

    static getClass() {
        return 'org.supplychainnet.productOrder';
    }
}

module.exports = ProductOrder;
