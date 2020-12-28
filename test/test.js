'use strict'

const SupplychainContract = require('../contract/lib/supplychaincontract').SupplychainContract;
const SupplychainContext = require('../contract/lib/supplychaincontract').SupplychainContext;
const  Shim = require('fabric-shim');

var contract = new SupplychainContract();
var context = new SupplychainContext();
Shim.start(new Chaincode())
contract.init(context);
let  args = {
    "rawMaterialsBatchId":"rawMaterials-001",
    "rawMaterialsType":"gear001",
    "manufacturer":"tecent",
    "price":"11.1",
    "quantity":"100",
    "shipperId":"",
    "modifiedBy":"",
    "info":"rawMaterialsStoreAdd",
    "qualityInspector":"jack",
    "quality":"good"

}
contract.stockStore(context,args);
