/*
SPDX-License-Identifier: Apache-2.0
*/

'use strict';

// Fabric smart contract classes
const {Contract, Context} = require('fabric-contract-api');

//supplychainnet specifc classes
const Order = require('./order.js');
const productOrderState = require('./OrderState.js').productOrderState;
const rawMaterialsOrderState = require('./OrderState.js').rawMaterialsOrderState;
const ProductOrder = require('./ProductOrder.js');
const RawMaterialsOrder = require('./RawMaterialsOrder.js');
const role =require('../ledger-api/role.js').role;
const accountName =require('../ledger-api/role').accountName;
const accountPassword = require('../ledger-api/role').accountPassword;
const  RawMaterials = require('./RawMaterials');
//  EVENT
const EVENT_TYPE = "bcpocevent";
const RAW_MATERIALS_EVENT_TYPE = "rwevent";
//  Error codes
const DUPLICATE_ORDER_ID = 101;
const ORDER_ID_NOT_FOUND = 102;

/**
 * A custom context provides easy access to list of all products
 */
class SupplychainContext extends Context {
    constructor() {
        super();
    }
}

/**
 * Define product smart contract by extending Fabric Contract class
 */
class SupplychainContract extends Contract {

    constructor() {
        // Unique namespace when multiple contracts per chaincode file
        super('org.supplychainnet.contract');
    }

    /**
     * Define a custom context for product
     */
    createContext() {
        return new SupplychainContext();
    }

    /**
     * Instantiate to perform any setup of the ledger that might be required.
     * @param {Context} ctx the transaction context
     */
    async init(ctx) {
        // No implementation required with this example
        // It could be where data migration is performed, if necessary
        console.log('Instantiate the contract');
    }

    /**
     * rawMaterialsStore store rawMaterials f
     * @param ctx
     * @param args
     * @returns {Promise<void>}
     *
     * Definition:  RawMaterials:
     * RawMaterialsStore 入库原型
     * {String}  rawMaterialsBatchId
     * {String}  rawMaterialsType
     * {String}  manufacturer
     * {float}   price
     * {Integer} quantity
     * {String} shipperId
     * {String} modifiedBy
     * {String[]} info
     * {String} qualityInspector
     * {String} quality
     */
    async stockStore(ctx,args){
        // Access Control: This transaction should only be invoked by a Producer or admin
        let userType = await this.getCurrentUserType(ctx);
        if((userType != role.ADMIN)&&
            (userType != role.RAW_MATERIALS_STORE)){
            throw  new Error(`This user does not have access to store rawMaterials`)
        }

        let rawMaterialsDetail = JSON.parse(args);
        let manufacturer = rawMaterialsDetail.manufacturer;
        let rawMaterialsType = rawMaterialsDetail.rawMaterialsType;

        let tempArr = [];
        tempArr.push(manufacturer);
        tempArr.push(rawMaterialsType);
        console.log("incoming asset fields: " + JSON.stringify(rawMaterialsDetail));

        // Check if an order already exists with id=manufacturer:rawMaterialsType
        let orderAsBytes = await ctx.stub.getState(tempArr.join(':'));
        let rawMaterials;
       if (orderAsBytes.length < 1) {
            console.log(`Error Message from RawMaterials. it need to add rawMaterials to the store`);
           rawMaterials = RawMaterials.createInstance(batchId);
       }else {
           rawMaterials = JSON.parse(orderAsBytes);
           rawMaterials.quality = parseInt(rawMaterials.quantity)+rawMaterialsDetail.quantity;
       }
        rawMaterials.rawMaterialsBatchId = rawMaterialsDetail.rawMaterialsBatchId;
        rawMaterials.rawMaterialsType = rawMaterialsDetail.rawMaterialsType;
        rawMaterials.manufacturer = rawMaterialsDetail.manufacturer;
        rawMaterials.price = rawMaterialsDetail.price.toString();
        rawMaterials.quantity = rawMaterialsDetail.quantity.toString();
        rawMaterials.shipperId = rawMaterialsDetail.shipperId;
        rawMaterials.modifiedBy = await this.getCurrentUserId(ctx);
        rawMaterials.info = rawMaterialsDetail.info;
        rawMaterials.qualityInspector = rawMaterialsDetail.qualityInspector;
        rawMaterials.quality = rawMaterialsDetail.quality;

        // Update ledger,使用manufacturer:rawMaterialsType作为key存储至区块链。
        await ctx.stub.putState(tempArr.join(':'), rawMaterials.toBuffer());
        // Define and set event
        const event_obj = rawMaterials;
        event_obj.event_type = "rawMaterialsStock";   //  add the field "event_type" for the event to be processed

        try {
            await ctx.stub.setEvent(RAW_MATERIALS_EVENT_TYPE, event_obj.toBuffer());
        } catch (error) {
            console.log("Error in sending event");
        } finally {
            console.log("Attempted to send event = ", rawMaterials);
        }

        // Must return a serialized order to caller of smart contract
        return rawMaterials.toBuffer();
    }

    /**
     * 根据rawMaterialsType查询rawMaterialsStore的所有商品。
     * @param ctx
     */
    async queryRawMaterialsByType(ctx,rawMaterialsType){
        console.info('==========queryRawMaterialsByType==========')
        if(rawMaterialsType.length < 1 || rawMaterialsType){
            throw  new Error('rawMaterialsType is required as input')
        }
        let queryString = {
            "selector":{
                "$and":[
                    {
                        "rawMaterialsType":rawMaterialsType,
                    },
                    {
                        info:"rawMaterialsStoreAdd"
                    }
                ]

            }
        }

        console.log("In queryRawMaterialsByType:queryString=");
        console.log(queryString);
        // Get all orders that meet queryString criteria
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const allRawMaterialsOfOneType = [];

        while (true){
            const rasMaterials = await iterator.next();
            if(rasMaterials.value &&  rasMaterials.value.value.toString('utf8')){
                console.log(rasMaterials.value.value.toString('utf8'));
                let record;
                try {
                    record = JSON.parse(rasMaterials.value.value.toString('utf8'))
                }catch (err){
                    console.log(err);
                    record = rasMaterials.value.value.toString('utf8');
                }
                allRawMaterialsOfOneType.push(record);
            }

            if(rasMaterials.done){
                console.log('end of data');
                await iterator.close();
                console.info(allRawMaterialsOfOneType);
                return allRawMaterialsOfOneType;
            }
        }
    }
    /**
     * orderRawMaterials
     * To be used by a producer when he orders some rawMaterials
     *
     * Definition:  RawMaterialsOrder Order:
     *
     * {String}  rawMaterialsOrderId
     * {String}  rawMaterialsBatchId
     * {String}  rawMaterialsType
     * {String}  manufacturer
     * {float}   price
     * {Integer} quantity
     * {String} shipperId
     * {Enumerated orderStates} currentOrderState
     * {String} modifiedBy
     * {String[]} info
     * {String}  buyer
     * {String} trackingInfo
     * {String} storeType
     *
     *
     * Usage: submitTransaction ('orderRawMaterials', 'RawMaterialsOrder-001', 'RawMaterialsBatch-100', 'gear','CCP',100.00, 100, 'UPS', 'this is currentState','producer',[])
     * Usage: ["orderRawMaterials", "RawMaterialsOrder-001", "RawMaterialsBatch-100", "gear","CCP",100.00, 100, "UPS", "this is currentState","producer",[]]
     */
    async orderRawMaterials(ctx, args) {

        // Access Control: This transaction should only be invoked by a Producer
        let userType = await this.getCurrentUserType(ctx);
        if ((userType != role.ADMIN) && // admin only has access as a precaution.
            (userType != role.PRODUCER))
            throw new Error(`This user does not have access to create an order`);

        const order_details = JSON.parse(args);
        const orderId = order_details.rawMaterialsOrderId;
        let tempArr  = [];
        tempArr.push(order_details.manufacturer);
        tempArr.push(order_details.rawMaterialsType);

        console.log("incoming asset fields: " + JSON.stringify(order_details));
        let rawMaterials = await ctx.stub.getStats(tempArr.join(':'));
        rawMaterials = RawMaterials.deserialize(rawMaterials);
        if (parseInt(rawMaterials.quantity)<order_details.quantity){
            throw new Error(`the storage of  ${order_details.rawMaterialsType} is lower your need`)
        }else{
            rawMaterials.quantity = parseInt(rawMaterials.quantity) - order_details.quantity;
            ctx.stub.putState(tempArr.join(':'),JSON.stringify(rawMaterials));
        }
        // Check if an order already exists with id=rawMaterialsOrderId
        let orderAsBytes = await ctx.stub.getState(rawMaterialsOrderId);
        if (orderAsBytes && orderAsBytes.length > 0) {
            throw new Error(`Error Message from orderProduct. Order with orderId = ${orderId} already exists.`);
        }

        //Create a new Order object
        let order = RawMaterialsOrder.createInstance(orderId);
        order.rawMaterialsOrderId = order_details.rawMaterialsOrderId;
        order.rawMaterialsType = order_details.rawMaterialsType;
        order.price = order_details.price.toString();
        order.quantity = order_details.quantity.toString();
        order.manufacturer = order_details.manufacturer;
        order.modifiedBy = await this.getCurrentUserId(ctx);
        order.currentOrderState = rawMaterialsOrderState.RAW_MATERIALS_ORDER_CREATED;
        order.trackingInfo = '';
        order.info = [];
        order.buyer= order_details.buyer;
        order.storeType = order_details.storeType;

        // Update ledger
        await ctx.stub.putState(orderId, order.toBuffer());

        // Define and set event
        const event_obj = order;
        event_obj.event_type = "createRawMaterialsOrder";   //  add the field "event_type" for the event to be processed

        try {
            await ctx.stub.setEvent(EVENT_TYPE, event_obj.toBuffer());
        } catch (error) {
            console.log("Error in sending event");
        } finally {
            console.log("Attempted to send event = ", order);
        }

        // Must return a serialized order to caller of smart contract
        return order.toBuffer();
    }

    /**
     * receiveRawMaterialsOrder
     * To be called by a RawMaterialsStore or admin when an RawMaterialsOrder is received (and he begins to process the order)
     *
     * @param {Context} ctx the transaction context
     * @param {String}  orderId
     * Usage:  receiveOrder ('Order001')
     */
    async receiveRawMaterialsOrder(ctx, orderId) {
        console.info('============= receiveRawMaterialsOrder ===========');

        if (orderId.length < 1) {
            throw new Error('rawMaterialsOrderId is required as input')
        }

        // Retrieve the current order using key provided
        let orderAsBytes = await ctx.stub.getState(orderId);
        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from receiveOrder: Order with rawMaterialsOrderId = ${orderId} does not exist.`);
        }

        // Convert order so we can modify fields
        let order = RawMaterialsOrder.deserialize(orderAsBytes);

        // Access Control: This transaction should only be invoked by designated Producer
        let userId = await this.getCurrentUserId(ctx);
        let userType = await this.getCurrentUserType(ctx);

        if ((userId != accountName.ADMIN) && // admin only has access as a precaution.
            userType != role.RAW_MATERIALS_STORE)
            throw new Error(`${userId} does not have access to receive order ${orderId}`);

        // Change currentOrderState
        order.setStateToRawMaterialsOrderReceived();

        // Track who is invoking this transaction
        order.modifiedBy = userId;

        // Update ledger
        await ctx.stub.putState(orderId, order.toBuffer());

        // Must return a serialized order to caller of smart contract
        return order.toBuffer();
    }

    /**
     * assignRawMaterialsOrderShipper
     * assign as shipper for the RawMaterialsOrder
     * @param {Context} ctx the transaction context
     * @param {String}  orderId of  RawMaterialsOrder
     * @param {String}  newShipperId
     *
     * Usage:  assignShipper ('Order001', 'UPS')
     */
    async assignRawMaterialsOrderShipper(ctx, orderId, newShipperId) {
        console.info('============= assignRawMaterialsOrderShipper ===========');

        if (orderId.length < 1) {
            throw new Error('orderId is required as input')
        }

        if (newShipperId.length < 1) {
            throw new Error('shipperId is required as input')
        }

        //  Retrieve the current order using key provided
        let orderAsBytes = await ctx.stub.getState(orderId);
        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from assignShipper: Order with orderId = ${orderId} does not exist.`);
        }

        // Convert order so we can modify fields
        let order = RawMaterialsOrder.deserialize(orderAsBytes);

        // Access Control: This transaction should only be invoked by designated Producer
        let userId = await this.getCurrentUserId(ctx);
        let userType = await this.getCurrentUserType(ctx);

        if ((userId != accountName.ADMIN) && // admin only has access as a precaution.
            (userType != role.RAW_MATERIALS_STORE ))
            throw new Error(`${userId} does not have access to assign a shipper to order ${orderId}`);

        // Change currentOrderState to SHIPMENT_ASSIGNED;
        order.setStateToRawMaterialsOrderShipmentAssigned();
        // Set shipperId
        order.shipperId = newShipperId;
        // Track who is invoking this transaction
        order.modifiedBy = userId;

        // Update ledger
        await ctx.stub.putState(orderId, order.toBuffer());

        // Must return a serialized order to caller of smart contract
        return order.toBuffer();
    }

    /**
     * createRawMaterialsOrderShipment
     *
     * @param {Context} ctx the transaction context
     * @param {String}  orderId
     * @param {String}  trackingInfo
     * Usage:  createShipment ('Order001', '34590279RKE9D339')
     */
    async createRawMaterialsOrderShipment(ctx, orderId, newTrackingInfo) {
        console.info('============= createRawMaterialsOrderShipment ===========');

        //  NOTE: There is no shipment asset.  A shipment is created for each order.
        //  Shipment is tracked using order asset.

        if (orderId.length < 1) {
            throw new Error('orderId is required as input')
        }

        if (newTrackingInfo.length < 1) {
            throw new Error('Tracking # is required as input')
        }

        // Retrieve the current order using key provided
        var orderAsBytes = await ctx.stub.getState(orderId);
        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from createShipment: Order with orderId = ${orderId} does not exist.`);
        }

        // Convert order so we can modify fields
        var order = RawMaterialsOrder.deserialize(orderAsBytes);

        // Access Control: This transaction should only be invoked by a designated Shipper
        let userId = await this.getCurrentUserId(ctx);

        if ((userId != accountName.ADMIN) && // admin only has access as a precaution.
            (userId != order.shipperId))
            throw new Error(`${userId} does not have access to create a shipment for order ${orderId}`);

        // Change currentOrderState to SHIPMENT_CREATED;
        order.setStateToRawMaterialsOrderShipmentCreated();

        // Set Tracking info
        order.trackingInfo = newTrackingInfo;
        // Track who is invoking this transaction
        order.modifiedBy = userId;

        // Update ledger
        await ctx.stub.putState(orderId, order.toBuffer());

        // Must return a serialized order to caller of smart contract
        return order.toBuffer();
    }

    /**
     * rawMaterialsOrderTransportShipment
     *
     * @param {Context} ctx the transaction context
     * @param {String}  orderId
     *
     * Usage:  transportShipment ('Order001')
     */
    async transportShipment(ctx, orderId) {
        console.info('============= transportShipment ===========');

        if (orderId.length < 1) {
            throw new Error('orderId is required as input')
        }

        // Retrieve the current order using key provided
        let orderAsBytes = await ctx.stub.getState(orderId);
        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from transportShipment: Order with orderId = ${orderId} does not exist.`);
        }

        // Retrieve the current order using key provided
        let order = RawMaterialsOrder.deserialize(orderAsBytes);

        // Access Control: This transaction should only be invoked by designated designated Shipper
        let userId = await this.getCurrentUserId(ctx);

        if ((userId != accountName.ADMIN) // admin only has access as a precaution.
            && (userId != order.shipperId)) // This transaction should only be invoked by
            throw new Error(`${userId} does not have access to transport shipment for order ${orderId}`);

        // Change currentOrderState to SHIPMENT_IN_TRANSIT;
        order.setStateToRawMaterialsOrderShipmentInTransit();
        // Track who is invoking this transaction
        order.modifiedBy = userId;

        // Update ledger
        await ctx.stub.putState(orderId, order.toBuffer());

        // Must return a serialized order to caller of smart contract
        return order.toBuffer();
    }

    /**
     * receiveRawMaterialsOrderShipment:
     * To be called by Retailer when a shipment (corresponding to orderId) is received.
     *
     * @param {Context} ctx the transaction context
     * @param {String}  orderId
     * Usage:  receiveShipment ('Order001')
     */
    async receiveShipment(ctx, orderId) {
        console.info('============= receiveShipment ===========');

        if (orderId.length < 1) {
            throw new Error('orderId is required as input')
        }

        // Retrieve the current order using key provided
        var orderAsBytes = await ctx.stub.getState(orderId);
        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from receiveShipment: Order with orderId = ${orderId} does not exist.`);
        }

        // Retrieve the current order using key provided
        var order = RawMaterialsOrder.deserialize(orderAsBytes);

        // Access Control: This transaction should only be invoked by designated originating Retailer
        let userId = await this.getCurrentUserId(ctx);
        let userType = await this.getCurrentUserType(ctx);

        if ((userId != accountName.ADMIN) // admin only has access as a precaution.
            && (userId != order.buyer)) // This transaction should only be invoked by
            throw new Error(`${userId} does not have access to receive shipment for order ${orderId}`);

        // Change currentOrderState to SHIPMENT_RECEIVED;
        order.setStateToRawMaterialsOrderShipmentReceived();
        // Track who is invoking this transaction
        order.modifiedBy = userId;

        // Update ledger
        await ctx.stub.putState(orderId, order.toBuffer());

        // Must return a serialized order to caller of smart contract
        return order.toBuffer();
    }

    /**
     * queryOrder
     *
     * @param {Context} ctx the transaction context
     * @param {String}  orderId
     * Usage:  queryOrder ('Order001')
     *
     */
    async queryOrder(ctx, orderId) {
        console.info('============= queryOrder ===========');

        if (orderId.length < 1) {
            throw new Error('orderId is required as input')
        }

        var orderAsBytes = await ctx.stub.getState(orderId);

        //  Set an event (irrespective of whether the order existed or not)
        // define and set EVENT_TYPE
        let queryEvent = {
            type: EVENT_TYPE,
            orderId: orderId,
            desc: "Query Order was executed for " + orderId
        };
        await ctx.stub.setEvent(EVENT_TYPE, Buffer.from(JSON.stringify(queryEvent)));

        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from queryOrder: Order with orderId = ${orderId} does not exist.`);
        }

        // Access Control:

        let order = RawMaterialsOrder.deserialize(orderAsBytes);
        let userId = await this.getCurrentUserId(ctx);
        let userType = await this.getCurrentUserType(ctx);

        if ((userId != accountName.ADMIN) // admin only has access as a precaution.
            && (userType != role.RAW_MATERIALS_STORE) // This transaction should only be invoked by
            && (userId != order.buyer) //     RawMaterialsStore, buyer, Shipper associated with order
            && (userId != order.shipperId)
            &&(userType != role.REGULATOR))
            throw new Error(`${userId} does not have access to the details of order ${orderId}`);

        // Return a serialized order to caller of smart contract
        return orderAsBytes;
        //return order;
    }

    /**
     * queryAllOrders
     *   New version of queryorders where ACLs are applied
     *
     * "customer": customer does not have access this api
     * "regulator": return all orders
     * "producer", "shipper","retailer": return the list of orders in which the caller is part of
     * @param {Context} ctx the transaction context
     * @param {String}  args
     * Usage:  queryAllOrders ()
     */
    async queryAllOrders(ctx) {
        console.info('============= getOrderHistory ===========');

        let userId = await this.getCurrentUserId(ctx);
        let userType = await this.getCurrentUserType(ctx);

        //  For adding filters in query, usage: {"selector":{"producerId":"farm1"}}
        let queryString;

        // Access control done using query strings
        switch (userType) {

            case role.ADMIN:{

            }
            case role.REGULATOR: {
                queryString = {
                    "selector": {}  //  no filter;  return all orders
                }
                break;
            }
            case role.RAW_MATERIALS_STORE: {
                queryString = {
                    "selector": {"storeType":role.RAW_MATERIALS_STORE}
                }
                break;
            }
            case role.SHIPPER: {
                queryString = {
                    "selector": {
                        "shipperId": userId
                    }
                }
                break;
            }
            case role.CUSTOMER: {
                throw new Error(`${userId} does not have access to this transaction`);
            }
            default: {
                return [];
            }
        }

        console.log("In queryAllOrders: queryString = ");
        console.log(queryString);
        // Get all orders that meet queryString criteria
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const allOrders = [];

        // Iterate through them and build an array of JSON objects
        while (true) {
            const order = await iterator.next();
            if (order.value && order.value.value.toString()) {
                console.log(order.value.value.toString('utf8'));

                let Record;

                try {
                    Record = JSON.parse(order.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    Record = order.value.value.toString('utf8');
                }

                // Add to array of orders
                allOrders.push(Record);
            }

            if (order.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allOrders);
                return allOrders;
            }
        }
    }

    /**
     * getOrderHistory
     *
     * @param {Context} ctx the transaction context
     * @param {String}  args
     * Usage:  getOrderHistory ('Order001')
     */

    async getOrderHistory(ctx, orderId) {
        console.info('============= getOrderHistory ===========');
        if (orderId.length < 1) {
            throw new Error('orderId is required as input')
        }
        console.log("input, orderId = " + orderId);

        // Retrieve the current order using key provided
        var orderAsBytes = await ctx.stub.getState(orderId);

        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from getOrderHistory: Order with orderId = ${orderId} does not exist.`);
        }

        // Access Control: Only those associated with this order
        // Retrieve the current order using key provided
        var order = Order.deserialize(orderAsBytes);
        let userId = await this.getCurrentUserId(ctx);
        let userType = await this.getCurrentUserType(ctx);

        // Access Control:
        if ((userId != accountName.ADMIN)             // admin only has access as a precaution.
            && (userType != role.CUSTOMER)      // Customers can see any order if it's in the correct state
            && (userType != role.REGULATOR)     // Regulators can see any order,store also get any order
            && (userId != order.producerId) // Only producer, shipper associated
            && (userType !=role.RAW_MATERIALS_STORE) //      with this order can see its details
            && (userId != order.shipperId))
            throw new Error(`${userId} does not have access to order ${orderId}`);

        // Customer can only view order history if order has completed cycle
        if ((userType == role.CUSTOMER) && (order.currentOrderState != rawMaterialsOrderState.RAW_MATERIALS_ORDER_SHIPMENT_RECEIVED))
            throw new Error(`Information about order ${orderId} is not available to ${userId} yet. Order status needs to be SHIPMENT_RECEIVED.`);

        console.info('start GetHistoryForOrder: %s', orderId);

        // Get list of transactions for order
        const iterator = await ctx.stub.getHistoryForKey(orderId);
        const orderHistory = [];

        while (true) {
            let history = await iterator.next();

            if (history.value && history.value.value.toString()) {
                let jsonRes = {};
                jsonRes.TxId = history.value.tx_id;
                jsonRes.IsDelete = history.value.is_delete.toString();
                // Convert Timestamp date
                var d = new Date(0);
                d.setUTCSeconds(history.value.timestamp.seconds.low);
                jsonRes.Timestamp = d.toLocaleString("zh-CN", {timeZone: "Asia/Shanghai"});
                // Store Order details
                try {
                    jsonRes.Value = JSON.parse(history.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    jsonRes.Value = history.value.value.toString('utf8');
                }

                // Add to array of transaction history on order
                orderHistory.push(jsonRes);
            }

            if (history.done) {
                console.log('end of data');
                await iterator.close();
                console.info(orderHistory);
                return orderHistory;
            }
        } //  while (true)
    }

    /**
     * deleteOrder
     *
     * @param {Context} ctx the transaction context
     * @param {String}  args
     * Usage:  deleteOrder ('Order001')
     */

    async deleteOrder(ctx, orderId) {

        console.info('============= deleteOrder ===========');
        if (orderId.length < 1) {
            throw new Error('Order Id required as input')
        }
        console.log("orderId = " + orderId);

        // Retrieve the current order using key provided
        var orderAsBytes = await ctx.stub.getState(orderId);

        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Error Message from deleteOrder: Order with orderId = ${orderId} does not exist.`);
        }

        // Access Control: This transaction should only be invoked by designated originating Retailer or Producer
        var order = RawMaterialsOrder.deserialize(orderAsBytes);
        let userId = await this.getCurrentUserId(ctx);
        let userType = await this.getCurrentUserType(ctx);

        if ((userId != accountName.ADMIN) // admin only has access as a precaution.
            && (userId != order.buyer) // This transaction should only be invoked by Producer or Retailer of order
            && (userType != role.RAW_MATERIALS_STORE))
            throw new Error(`${userId} does not have access to delete order ${orderId}`);

        await ctx.stub.deleteState(orderId); //remove the order from chaincode state
    }

    /**
     * getCurrentUserId
     * To be called by application to get the type for a user who is logged in
     *
     * @param {Context} ctx the transaction context
     * Usage:  getCurrentUserId ()
     */
    async getCurrentUserId(ctx) {

        let id = [];
        id.push(ctx.clientIdentity.getID());
        var begin = id[0].indexOf("/CN=");
        var end = id[0].lastIndexOf("::/C=");
        let userid = id[0].substring(begin + 4, end);
        return userid;
    }

    /**
     * getCurrentUserType
     * To be called by application to get the type for a user who is logged in
     *
     * @param {Context} ctx the transaction context
     * Usage:  getCurrentUserType ()
     */
    async getCurrentUserType(ctx) {

        let userid = await this.getCurrentUserId(ctx);

        //  check user id;  if admin, return type = admin;
        //  else return value set for attribute "type" in certificate;
        if (userid == "admin") {
            return userid;
        }
        return ctx.clientIdentity.getAttributeValue("usertype");
    }


}  //  Class SupplychainContract

module.exports.SupplychainContract = SupplychainContract;
module.exports.SupplychainContext = SupplychainContext;