'use strict';

// Utility class for ledger state
const State = require('../ledger-api/state.js');

class RawMaterials extends State{
    constructor(obj) {
        super(RawMaterials.getClass(), [obj.rawMaterialsBatchId]);
        Object.assign(this, obj);
    }

    /**
     * Basic getters and setters
     */
    getId() {
        return this.rawMaterialsBatchId;
    }

    static fromBuffer(buffer) {
        return RawMaterialsOrder.deserialize(Buffer.from(JSON.parse(buffer)));
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to  RawMaterials
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return State.deserializeClass(data, RawMaterials);
    }

    /**
     * Factory method to create a order object
     */
    static createInstance(rawMaterialsBatchId) {
        return new RawMaterials({rawMaterialsBatchId});
    }

    static getClass() {
        return 'org.supplychainnet.rawMaterials';
    }
}

module.exports = RawMaterials;
