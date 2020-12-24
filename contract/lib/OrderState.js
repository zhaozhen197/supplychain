'use strict';

const rawMaterialsOrderState = {
    RAW_MATERIALS_ORDER_CREATED: 0-1, // Producer
    RAW_MATERIALS_ORDER_RECEIVED: 0-2, // RawMaterialsStore
    RAW_MATERIALS_ORDER_SHIPMENT_ASSIGNED: 0-3 ,   // RawMaterialsStore
    RAW_MATERIALS_ORDER_SHIPMENT_CREATED: 0-4,    // Shipper
    RAW_MATERIALS_ORDER_SHIPMENT_IN_TRANSIT: 0-5, // Shipper
    RAW_MATERIALS_ORDER_SHIPMENT_RECEIVED: 0-6,   // producer
    RAW_MATERIALS_ORDER_CLOSED:0-7
  };

const productOrderState = {
    PRODUCT_ORDER_CREATED: 1-1, // Customer
    PRODUCT_ORDER_RECEIVED: 1-2, // ProductStore
    PRODUCT_ORDER_PRODUCER_ASSIGNED:1-3, // ProductStore
    PRODUCT_ORDER_PRODUCER_RECEIVED:1-4, // Producer
    PRODUCT_ORDER_PRODUCER_PRODUCING:1-5, // Producer
    PRODUCT_ORDER_PRODUCER_PRODUCED:1-6,  // Producer
    PRODUCT_ORDER_SHIPMENT_ASSIGNED: 1-7 ,   // Producer
    PRODUCT_ORDER_SHIPMENT_CREATED: 1-8,    // Shipper
    PRODUCT_ORDER_SHIPMENT_IN_TRANSIT: 1-9, // Shipper
    PRODUCT_ORDER_SHIPMENT_RECEIVED: 1-10,   // Customer
    PRODUCT_ORDER_CLOSED:1-11,
};


module.exports.rawMaterialsOrderState = rawMaterialsOrderState;
module.exports.productOrderState = productOrderState;